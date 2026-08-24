import "server-only";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, habitLogs, habits, monthlyGoals, settings } from "@/db/schema";
import { monthStartISO, todayISO } from "@/lib/dates";

export async function getSettings() {
  const rows = await db.select().from(settings).limit(1);
  return rows[0] ?? null;
}

export async function getCheckin(logDate: string) {
  const rows = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.logDate, logDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveHabits() {
  return db
    .select()
    .from(habits)
    .where(eq(habits.isActive, true))
    .orderBy(habits.sortOrder, habits.name);
}

/** Log rows for a set of habits over a date range, oldest first. */
export async function getHabitLogs(habitIds: string[], fromISO: string, toISO: string) {
  if (habitIds.length === 0) return [];
  return db
    .select()
    .from(habitLogs)
    .where(
      and(
        inArray(habitLogs.habitId, habitIds),
        gte(habitLogs.logDate, fromISO),
        lte(habitLogs.logDate, toISO),
      ),
    )
    .orderBy(habitLogs.logDate);
}

/** Which habits are logged on one specific day. */
export async function getHabitLogsForDate(logDate: string) {
  return db.select().from(habitLogs).where(eq(habitLogs.logDate, logDate));
}

/** Active goals for this month, used for the rotating line on /today. */
export async function getActiveMonthlyGoals() {
  return db
    .select()
    .from(monthlyGoals)
    .where(and(eq(monthlyGoals.month, monthStartISO()), eq(monthlyGoals.status, "active")))
    .orderBy(desc(monthlyGoals.createdAt));
}
