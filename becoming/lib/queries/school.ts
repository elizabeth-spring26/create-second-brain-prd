import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, meetings } from "@/db/schema";
import { parseFollowUps } from "@/lib/granola/sync";

export type AssignmentBucket = "overdue" | "today" | "week" | "later" | "done";

export async function getAssignments() {
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      pointsPossible: assignments.pointsPossible,
      htmlUrl: assignments.htmlUrl,
      submittedAt: assignments.submittedAt,
      myStatus: assignments.myStatus,
      myPriority: assignments.myPriority,
      estMinutes: assignments.estMinutes,
      isManual: assignments.isManual,
      courseName: courses.name,
      courseCode: courses.code,
      courseColor: courses.colorToken,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .orderBy(assignments.dueAt);

  return rows;
}

/** Follow-ups pulled out of recently synced Granola meetings. */
export async function getMeetingFollowUps(limit = 5) {
  const rows = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.startedAt))
    .limit(25);

  const out = [];
  for (const m of rows) {
    const items = parseFollowUps(m.summaryMarkdown);
    if (items.length === 0) continue;
    out.push({
      id: m.id,
      title: m.title,
      startedAt: m.startedAt,
      folderName: m.folderName,
      webUrl: m.webUrl,
      items,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function bucketOf(dueAt: Date | null, submittedAt: Date | null, now: Date): AssignmentBucket {
  if (submittedAt) return "done";
  if (!dueAt) return "later";
  const ms = dueAt.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms < 24 * 3600 * 1000) return "today";
  if (ms < 7 * 24 * 3600 * 1000) return "week";
  return "later";
}
