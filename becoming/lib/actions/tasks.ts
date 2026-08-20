"use server";

import { and, eq, isNotNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { assignments, courses, meetings, tasks } from "@/db/schema";
import { getSettings } from "@/lib/queries/daily";
import { addDaysISO, toLogDate, todayISO, weekStartISO } from "@/lib/dates";
import { parseFollowUps } from "@/lib/granola/sync";

const NewTask = z.object({
  title: z.string().min(1).max(300),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function addTask(input: z.infer<typeof NewTask>) {
  const parsed = NewTask.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Give the task a title." };

  await db.insert(tasks).values({
    title: parsed.data.title,
    dueDate: parsed.data.dueDate ?? null,
    notes: parsed.data.notes ?? null,
    source: "manual",
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function toggleTask(id: string) {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  const t = rows[0];
  if (!t) return { ok: false as const, error: "Task not found." };

  await db
    .update(tasks)
    .set({ done: !t.done, doneAt: t.done ? null : new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/");
  return { ok: true as const };
}

export async function moveTask(id: string, dueDate: string | null) {
  await db.update(tasks).set({ dueDate, updatedAt: new Date() }).where(eq(tasks.id, id));
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Pull this week's work out of Granola (and Canvas, if she's turned it on)
 * into the one task list. Upserts on (source, sourceKey) so re-importing
 * updates rather than duplicating, and never resets something already ticked.
 */
export async function importTasks() {
  const settings = await getSettings();
  const today = todayISO();
  const weekEnd = addDaysISO(weekStartISO(), 6);
  let imported = 0;

  async function upsert(
    source: "canvas" | "granola",
    sourceKey: string,
    values: { title: string; dueDate: string | null; url: string | null },
  ) {
    const found = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.source, source), eq(tasks.sourceKey, sourceKey)))
      .limit(1);

    if (found.length > 0) {
      // Only refresh the label and link — `done` is hers.
      await db
        .update(tasks)
        .set({ title: values.title, url: values.url, updatedAt: new Date() })
        .where(eq(tasks.id, found[0].id));
    } else {
      await db.insert(tasks).values({ source, sourceKey, ...values });
      imported++;
    }
  }

  // ── Granola follow-ups ───────────────────────────────────────────────────
  const recent = await db.select().from(meetings).orderBy(meetings.startedAt);
  const cutoff = addDaysISO(today, -30);

  for (const m of recent) {
    const when = m.startedAt ? toLogDate(m.startedAt) : null;
    if (!when || when < cutoff) continue;
    const items = parseFollowUps(m.summaryMarkdown);
    for (const [i, item] of items.entries()) {
      await upsert("granola", `${m.granolaNoteId}#${i}`, {
        title: item,
        dueDate: null, // no real due date — it belongs to the week, not a day
        url: m.webUrl,
      });
    }
  }

  // ── Canvas, only if she's switched it on ─────────────────────────────────
  if (settings?.showCanvas) {
    const rows = await db
      .select({
        id: assignments.canvasAssignmentId,
        title: assignments.title,
        dueAt: assignments.dueAt,
        url: assignments.htmlUrl,
        hidden: courses.isHidden,
      })
      .from(assignments)
      .leftJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(isNotNull(assignments.dueAt), lte(assignments.dueAt, new Date(`${weekEnd}T23:59:59`))));

    for (const a of rows) {
      if (a.hidden || !a.id || !a.dueAt) continue;
      const due = toLogDate(a.dueAt);
      if (due < today) continue; // last semester is noise
      await upsert("canvas", String(a.id), {
        title: a.title,
        dueDate: due,
        url: a.url,
      });
    }
  }

  revalidatePath("/");
  return { ok: true as const, imported };
}
