import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { recordSync, getSyncState } from "@/lib/canvas/sync";
import {
  getNote,
  granolaConfigured,
  listNotes,
  normalizeAttendees,
  normalizeFolder,
} from "./client";

const MAX_FOLLOWUP_CHARS = 90;

/** Trim to the first clause and cap the length — these are list items, not prose. */
function condense(s: string): string {
  let t = s
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]$/, "");

  // Drop the trailing explanation after an em dash or parenthetical.
  t = t.split(/\s+[—–]\s+/)[0].replace(/\s*\([^)]*\)\s*$/, "").trim();

  if (t.length > MAX_FOLLOWUP_CHARS) {
    const cut = t.slice(0, MAX_FOLLOWUP_CHARS);
    const lastSpace = cut.lastIndexOf(" ");
    t = `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
  return t;
}

/**
 * Extract the follow-ups from a Granola summary, short enough to scan.
 *
 * Granola writes next steps as a bold headline bullet followed by an indented
 * paragraph of detail. The headline is the actionable part, so when bold
 * bullets exist we take only those and ignore the prose underneath — that
 * detail is what made these unreadably long.
 */
export function parseFollowUps(markdown: string | null): string[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const bold: string[] = [];
  const plain: string[] = [];
  let inSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,6}\s/.test(line)) {
      inSection = /next steps|action items|follow[- ]?ups?|to-?dos?/i.test(line);
      continue;
    }
    if (!inSection) continue;

    const b = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*$/);
    if (b) {
      bold.push(condense(b[1]));
      continue;
    }
    const p = line.match(/^[-*]\s+(.{4,})$/);
    if (p) plain.push(condense(p[1]));
  }

  const chosen = bold.length > 0 ? bold : plain;
  return [...new Set(chosen)].filter((s) => s.length > 3).slice(0, 6);
}

/** First few key bullets of a summary, for a compact meeting card. */
export function summarize(markdown: string | null, max = 3): string[] {
  if (!markdown) return [];
  const out: string[] = [];
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (/next steps|action items/i.test(line)) break;
    const m = line.match(/^[-*]\s+(.{8,})$/);
    if (m) out.push(condense(m[1]));
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Read-only mirror of Granola notes. Upserts on `granola_note_id`, which
 * carries a unique index — running this twice must never duplicate a row.
 */
export async function syncGranola() {
  if (!granolaConfigured()) {
    return { ok: false as const, error: "Granola isn't configured yet." };
  }

  try {
    // Watermark the last successful run so we only pull what's new.
    const state = await getSyncState("granola");
    const createdAfter = state?.syncToken ?? undefined;

    const summaries = await listNotes(createdAfter);
    let synced = 0;

    for (const s of summaries) {
      const detail = await getNote(s.id);
      if (!detail) continue;

      const { folderId, folderName } = normalizeFolder(detail.folder_membership);
      const values = {
        title: detail.title ?? "Untitled meeting",
        summaryMarkdown: detail.summary_markdown ?? detail.summary_text ?? null,
        webUrl: detail.web_url ?? null,
        startedAt: detail.created_at ? new Date(detail.created_at) : null,
        attendees: normalizeAttendees(detail.attendees),
        folderId,
        folderName,
        googleEventId: detail.calendar_event?.id ?? null,
        category: folderName,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      };

      const found = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.granolaNoteId, detail.id))
        .limit(1);

      if (found.length > 0) {
        await db.update(meetings).set(values).where(eq(meetings.id, found[0].id));
      } else {
        await db.insert(meetings).values({ granolaNoteId: detail.id, ...values });
      }
      synced++;
    }

    // Watermark forward only on a clean run.
    await recordSync("granola", null, new Date().toISOString());
    return { ok: true as const, synced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordSync("granola", message);
    return { ok: false as const, error: message };
  }
}
