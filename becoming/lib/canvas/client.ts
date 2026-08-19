import "server-only";
import { z } from "zod";

/**
 * Canvas sends no CORS headers, so every one of these calls MUST run on the
 * server. Calling from a client component fails in the browser while appearing
 * to work in devtools — a confusing failure mode worth stating plainly.
 */

const BASE = () => {
  const domain = process.env.CANVAS_DOMAIN;
  if (!domain) throw new Error("CANVAS_DOMAIN is not set");
  return `https://${domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api/v1`;
};

function token() {
  const t = process.env.CANVAS_TOKEN;
  if (!t) throw new Error("CANVAS_TOKEN is not set");
  return t;
}

/** `Link: <...>; rel="next"` — Canvas paginates by header, not by body field. */
function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Follows `Link` headers to exhaustion. Backs off when Canvas signals it's
 * running low on quota — below 100 remaining it starts throttling hard.
 */
export async function paginate<T>(path: string, schema: z.ZodType<T>): Promise<T[]> {
  let url: string | null = path.startsWith("http") ? path : `${BASE()}${path}`;
  const out: T[] = [];
  let backoff = 500;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 429) {
      if (backoff > 8000) throw new Error(`Canvas throttled: ${res.status}`);
      await sleep(backoff);
      backoff *= 2;
      continue;
    }
    if (!res.ok) {
      throw new Error(`Canvas ${res.status} on ${url}: ${await res.text()}`);
    }

    const remaining = Number(res.headers.get("X-Rate-Limit-Remaining") ?? "999");
    const body: unknown = await res.json();
    const parsed = z.array(schema).safeParse(body);
    if (!parsed.success) {
      throw new Error(`Canvas returned an unexpected shape for ${url}`);
    }
    out.push(...parsed.data);

    url = nextLink(res.headers.get("Link"));
    if (remaining < 100) await sleep(1000);
  }

  return out;
}

/* ── Schemas. Canvas shapes vary by endpoint and null due_at is common. ───── */

export const CanvasCourse = z.object({
  id: z.number(),
  name: z.string(),
  course_code: z.string().nullish(),
  term: z.object({ name: z.string().nullish() }).nullish(),
});

export const CanvasAssignment = z.object({
  id: z.number(),
  course_id: z.number(),
  name: z.string(),
  due_at: z.string().nullish(),
  points_possible: z.number().nullish(),
  html_url: z.string().nullish(),
  submission: z
    .object({
      submitted_at: z.string().nullish(),
      score: z.number().nullish(),
    })
    .nullish(),
});

export type CanvasCourseT = z.infer<typeof CanvasCourse>;
export type CanvasAssignmentT = z.infer<typeof CanvasAssignment>;

export async function fetchCourses() {
  return paginate(
    "/courses?enrollment_state=active&per_page=100&include[]=term",
    CanvasCourse,
  );
}

export async function fetchAssignments(courseId: number) {
  return paginate(
    `/courses/${courseId}/assignments?include[]=submission&per_page=100`,
    CanvasAssignment,
  );
}

export function canvasConfigured() {
  return Boolean(process.env.CANVAS_DOMAIN && process.env.CANVAS_TOKEN);
}
