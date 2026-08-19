import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyCheckins,
  habitLogs,
  habits,
  monthlyGoals,
  weeklyReviews,
  workSessions,
} from "@/db/schema";
import { addDaysISO, monthStartISO, weekStartISO } from "@/lib/dates";

export async function getWeeklyReview(weekStart: string) {
  const rows = await db
    .select()
    .from(weeklyReviews)
    .where(eq(weeklyReviews.weekStart, weekStart))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecentReviews(limit = 8) {
  return db.select().from(weeklyReviews).orderBy(desc(weeklyReviews.weekStart)).limit(limit);
}

/**
 * The numbers she reflects against. Computed live so the review page always
 * shows the truth, then snapshotted onto the row at submit time.
 */
export async function getWeekStats(weekStart: string) {
  const weekEnd = addDaysISO(weekStart, 6);

  const checkins = await db
    .select()
    .from(dailyCheckins)
    .where(and(gte(dailyCheckins.logDate, weekStart), lte(dailyCheckins.logDate, weekEnd)));

  const sleeps = checkins.map((c) => c.sleepHours).filter((n): n is number => n !== null);
  const energies = checkins
    .map((c) => c.energyEvening ?? c.energyMorning)
    .filter((n): n is number => n !== null && n !== undefined);

  const active = await db.select().from(habits).where(eq(habits.isActive, true));
  const logs = await db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.logDate, weekStart), lte(habitLogs.logDate, weekEnd)));

  // Build habits: kept = logged. Break habits: kept = not logged.
  let kept = 0;
  let possible = 0;
  const loggedKey = new Set(logs.map((l) => `${l.habitId}|${l.logDate}`));
  for (const h of active) {
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(weekStart, i);
      possible++;
      const wasLogged = loggedKey.has(`${h.id}|${iso}`);
      if (h.direction === "build" ? wasLogged : !wasLogged) kept++;
    }
  }

  const sessions = await db
    .select()
    .from(workSessions)
    .where(and(gte(workSessions.sessionDate, weekStart), lte(workSessions.sessionDate, weekEnd)));
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const avg = (xs: number[]) =>
    xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

  return {
    weekStart,
    weekEnd,
    sleepAvg: avg(sleeps),
    energyAvg: avg(energies),
    habitPct: possible > 0 ? Math.round((kept / possible) * 100) : null,
    hoursWorked: Math.round((minutes / 60) * 10) / 10,
    daysLogged: checkins.length,
  };
}

/** The previous week's review, used for the "did you actually do it?" callback. */
export async function getPreviousReview(weekStart: string) {
  const prev = addDaysISO(weekStart, -7);
  return getWeeklyReview(prev);
}

export async function getMonthlyGoals(month: string = monthStartISO()) {
  return db
    .select()
    .from(monthlyGoals)
    .where(eq(monthlyGoals.month, month))
    .orderBy(monthlyGoals.createdAt);
}

export { weekStartISO };
