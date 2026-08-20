import "server-only";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDaysISO, monthStartISO, todayISO, weekStartISO } from "@/lib/dates";

export type TaskRow = typeof tasks.$inferSelect;

/** Monday→Sunday for the week containing `anchor`. */
export function weekDays(anchor?: string): string[] {
  const start = weekStartISO(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

/** Last day of the month containing `iso`. */
function monthEndISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

/**
 * This week and the rest of this month — nothing older.
 *
 * Overdue tasks are deliberately not surfaced. A list that accumulates last
 * month's misses is a guilt ledger, and the point of this app is the opposite:
 * a day that passed is closed, and the week in front of her is what matters.
 * Nothing is deleted — old tasks stay in the table, they just aren't shown.
 */
export async function getWeekTasks(anchor?: string) {
  const today = anchor ?? todayISO();
  const days = weekDays(today);
  const weekStart = days[0];
  const weekEnd = days[6];

  // Never look further back than the start of this month or this week.
  const floor = monthStartISO(today) > weekStart ? weekStart : monthStartISO(today);
  const ceiling = monthEndISO(today);

  const rows = await db
    .select()
    .from(tasks)
    .where(
      or(
        and(gte(tasks.dueDate, floor), lte(tasks.dueDate, ceiling)),
        isNull(tasks.dueDate),
      ),
    )
    .orderBy(tasks.sortOrder, tasks.createdAt);

  const byDay = new Map<string, TaskRow[]>();
  for (const d of days) byDay.set(d, []);
  const undated: TaskRow[] = [];
  const laterThisMonth: TaskRow[] = [];

  for (const t of rows) {
    if (!t.dueDate) {
      undated.push(t);
    } else if (byDay.has(t.dueDate)) {
      byDay.get(t.dueDate)!.push(t);
    } else if (t.dueDate > weekEnd && t.dueDate <= ceiling) {
      laterThisMonth.push(t);
    }
    // Anything before this week is simply not shown.
  }

  laterThisMonth.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  return { days, byDay, undated, laterThisMonth, monthEnd: ceiling };
}

export async function getOpenTaskCount() {
  const rows = await db.select().from(tasks).where(eq(tasks.done, false));
  return rows.length;
}
