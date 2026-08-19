import "server-only";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, habitLogs, habits, monthlyGoals, settings } from "@/db/schema";
import type { RibbonPoint } from "@/components/energy-ribbon";
import { addDaysISO, monthStartISO, todayISO } from "@/lib/dates";

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

/**
 * The Energy Ribbon's data: the last `days` days of check-ins. Days without a
 * check-in come back with null energy and are simply not plotted — a gap, not
 * a zero, because a zero would read as "no energy" rather than "no entry".
 */
export async function getRibbonPoints(days = 30): Promise<RibbonPoint[]> {
  const today = todayISO();
  const from = addDaysISO(today, -(days - 1));

  const rows = await db
    .select({
      logDate: dailyCheckins.logDate,
      energyMorning: dailyCheckins.energyMorning,
      energyEvening: dailyCheckins.energyEvening,
      sleepHours: dailyCheckins.sleepHours,
    })
    .from(dailyCheckins)
    .where(and(gte(dailyCheckins.logDate, from), lte(dailyCheckins.logDate, today)))
    .orderBy(dailyCheckins.logDate);

  const byDate = new Map(rows.map((r) => [r.logDate, r]));
  const out: RibbonPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i);
    const r = byDate.get(iso);
    // Prefer evening energy — it's the fuller picture of how the day actually went.
    const energy = r ? (r.energyEvening ?? r.energyMorning ?? null) : null;
    out.push({ date: iso, energy, sleep: r?.sleepHours ?? null });
  }
  return out;
}

/** Active goals for this month, used for the rotating line on /today. */
export async function getActiveMonthlyGoals() {
  return db
    .select()
    .from(monthlyGoals)
    .where(and(eq(monthlyGoals.month, monthStartISO()), eq(monthlyGoals.status, "active")))
    .orderBy(desc(monthlyGoals.createdAt));
}
