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

/** Extract "## Action Items" style follow-ups from a Granola summary. */
export function parseFollowUps(markdown: string | null): string[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,6}\s/.test(line)) {
      inSection = /next steps|action items|follow[- ]?ups?/i.test(line);
      continue;
    }
    if (!inSection) continue;

    // Granola renders next steps as bold bullets: "- **Do the thing**"
    const m = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*$/) ?? line.match(/^[-*]\s+(.{4,})$/);
    if (m) out.push(m[1].trim());
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
