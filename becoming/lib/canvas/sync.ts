import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, syncState } from "@/db/schema";
import { canvasConfigured, fetchAssignments, fetchCourses } from "./client";

/**
 * Read-only. This module never writes to Canvas — no submissions, no grades.
 *
 * The critical rule: `my_status`, `my_priority`, and `est_minutes` are HER
 * data, not Canvas's. An update must set only the Canvas-owned columns, or a
 * sync silently erases the estimates she spent time entering.
 */
export async function syncCanvas() {
  if (!canvasConfigured()) {
    return { ok: false as const, error: "Canvas isn't configured yet." };
  }

  try {
    const remoteCourses = await fetchCourses();
    let courseCount = 0;
    let assignmentCount = 0;

    for (const rc of remoteCourses) {
      const existing = await db
        .select()
        .from(courses)
        .where(eq(courses.canvasCourseId, rc.id))
        .limit(1);

      let courseId: string;
      if (existing.length > 0) {
        courseId = existing[0].id;
        await db
          .update(courses)
          .set({
            name: rc.name,
            code: rc.course_code ?? null,
            term: rc.term?.name ?? null,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, courseId));
      } else {
        const inserted = await db
          .insert(courses)
          .values({
            canvasCourseId: rc.id,
            name: rc.name,
            code: rc.course_code ?? null,
            term: rc.term?.name ?? null,
          })
          .returning({ id: courses.id });
        courseId = inserted[0].id;
      }
      courseCount++;

      for (const ra of await fetchAssignments(rc.id)) {
        // Canvas-owned fields ONLY. Her overlay is deliberately absent here.
        const canvasFields = {
          courseId,
          title: ra.name,
          dueAt: ra.due_at ? new Date(ra.due_at) : null,
          pointsPossible: ra.points_possible ?? null,
          htmlUrl: ra.html_url ?? null,
          submittedAt: ra.submission?.submitted_at
            ? new Date(ra.submission.submitted_at)
            : null,
          gradedScore: ra.submission?.score ?? null,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        };

        const found = await db
          .select({ id: assignments.id })
          .from(assignments)
          .where(eq(assignments.canvasAssignmentId, ra.id))
          .limit(1);

        if (found.length > 0) {
          await db
            .update(assignments)
            .set(canvasFields)
            .where(eq(assignments.id, found[0].id));
        } else {
          await db
            .insert(assignments)
            .values({ canvasAssignmentId: ra.id, ...canvasFields });
        }
        assignmentCount++;
      }
    }

    await recordSync("canvas", null);
    return { ok: true as const, courseCount, assignmentCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordSync("canvas", message);
    return { ok: false as const, error: message };
  }
}

export async function recordSync(
  provider: "canvas" | "google_calendar" | "granola",
  error: string | null,
  syncToken?: string | null,
) {
  const existing = await db
    .select({ id: syncState.id })
    .from(syncState)
    .where(eq(syncState.provider, provider))
    .limit(1);

  const patch = error
    ? { lastError: error, lastErrorAt: new Date(), updatedAt: new Date() }
    : {
        lastSuccessAt: new Date(),
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
        ...(syncToken !== undefined ? { syncToken } : {}),
      };

  if (existing.length > 0) {
    await db.update(syncState).set(patch).where(eq(syncState.id, existing[0].id));
  } else {
    await db.insert(syncState).values({ provider, ...patch });
  }
}

export async function getSyncState(provider: "canvas" | "google_calendar" | "granola") {
  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.provider, provider))
    .limit(1);
  return rows[0] ?? null;
}
