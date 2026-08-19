import "server-only";
import { z } from "zod";

/** Read-only client for the Granola public API. Never writes back. */

const BASE = "https://public-api.granola.ai/v1";

function token() {
  const t = process.env.GRANOLA_API_KEY;
  if (!t) throw new Error("GRANOLA_API_KEY is not set");
  return t;
}

export function granolaConfigured() {
  return Boolean(process.env.GRANOLA_API_KEY);
}

/* ── Schemas, matching the shapes verified against the live API ───────────── */

const Person = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
});

export const NoteSummary = z.object({
  id: z.string(),
  title: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export const NoteDetail = NoteSummary.extend({
  web_url: z.string().nullish(),
  summary_markdown: z.string().nullish(),
  summary_text: z.string().nullish(),
  attendees: z.union([Person, z.array(Person)]).nullish(),
  calendar_event: z
    .object({ id: z.string().nullish(), html_link: z.string().nullish() })
    .nullish(),
  folder_membership: z
    .union([
      z.object({ folder_id: z.string().nullish(), name: z.string().nullish() }),
      z.array(z.object({ folder_id: z.string().nullish(), name: z.string().nullish() })),
    ])
    .nullish(),
});

export type NoteDetailT = z.infer<typeof NoteDetail>;

const ListResponse = z.object({
  notes: z.array(NoteSummary),
  hasMore: z.boolean().nullish(),
  cursor: z.string().nullish(),
});

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Granola ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Pages purely on `cursor`/`hasMore`. The `limit` parameter appeared to be
 * ignored by the API in testing, so it isn't relied on for page size — only
 * `maxPages` bounds the walk.
 */
export async function listNotes(createdAfter?: string, maxPages = 20) {
  const out: z.infer<typeof NoteSummary>[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    if (createdAfter) params.set("created_after", createdAfter);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();

    const parsed = ListResponse.safeParse(await get(`/notes${qs ? `?${qs}` : ""}`));
    if (!parsed.success) throw new Error("Granola /notes returned an unexpected shape");

    out.push(...parsed.data.notes);
    if (!parsed.data.hasMore || !parsed.data.cursor) break;
    cursor = parsed.data.cursor;
  }
  return out;
}

export async function getNote(id: string): Promise<NoteDetailT | null> {
  const parsed = NoteDetail.safeParse(await get(`/notes/${id}`));
  return parsed.success ? parsed.data : null;
}

/** Attendees come back as either a single object or an array. */
export function normalizeAttendees(
  a: NoteDetailT["attendees"],
): { name?: string; email?: string }[] {
  if (!a) return [];
  const arr = Array.isArray(a) ? a : [a];
  return arr.map((p) => ({ name: p.name ?? undefined, email: p.email ?? undefined }));
}

export function normalizeFolder(f: NoteDetailT["folder_membership"]) {
  if (!f) return { folderId: null, folderName: null };
  const one = Array.isArray(f) ? f[0] : f;
  return { folderId: one?.folder_id ?? null, folderName: one?.name ?? null };
}
