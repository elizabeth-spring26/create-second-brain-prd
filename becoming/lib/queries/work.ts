import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { engagements, meetings, workSessions } from "@/db/schema";
import { addDaysISO, monthStartISO, weekStartISO } from "@/lib/dates";

export async function getEngagements() {
  return db
    .select()
    .from(engagements)
    .where(eq(engagements.isActive, true))
    .orderBy(engagements.name);
}

export async function getSessionsBetween(fromISO: string, toISO: string) {
  return db
    .select()
    .from(workSessions)
    .where(and(gte(workSessions.sessionDate, fromISO), lte(workSessions.sessionDate, toISO)))
    .orderBy(desc(workSessions.sessionDate));
}

/** Week totals per engagement, against each one's weekly target. */
export async function getWeekByEngagement(weekStart = weekStartISO()) {
  const weekEnd = addDaysISO(weekStart, 6);
  const [list, sessions] = await Promise.all([
    getEngagements(),
    getSessionsBetween(weekStart, weekEnd),
  ]);

  return list.map((e) => {
    const minutes = sessions
      .filter((s) => s.engagementId === e.id)
      .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
    return {
      id: e.id,
      name: e.name,
      kind: e.kind,
      colorToken: e.colorToken,
      hours: Math.round((minutes / 60) * 10) / 10,
      target: e.hoursTargetWeekly,
      hourlyRate: e.hourlyRate,
    };
  });
}

export async function getMonthSummary(month = monthStartISO()) {
  const monthEnd = `${month.slice(0, 7)}-31`;
  const [list, sessions] = await Promise.all([
    getEngagements(),
    getSessionsBetween(month, monthEnd),
  ]);
  const rateById = new Map(list.map((e) => [e.id, e.hourlyRate]));

  let billableMinutes = 0;
  let nonBillableMinutes = 0;
  let value = 0;

  for (const s of sessions) {
    const m = s.minutes ?? 0;
    if (s.isBillable) {
      billableMinutes += m;
      const rate = rateById.get(s.engagementId);
      if (rate) value += (m / 60) * rate;
    } else {
      nonBillableMinutes += m;
    }
  }

  const h = (m: number) => Math.round((m / 60) * 10) / 10;
  return {
    totalHours: h(billableMinutes + nonBillableMinutes),
    billableHours: h(billableMinutes),
    nonBillableHours: h(nonBillableMinutes),
    estimatedValue: Math.round(value),
    sessionCount: sessions.length,
  };
}

/**
 * Meetings attributed to an engagement count as delivered work — that's the
 * whole reason Granola is wired in rather than sitting in a separate app.
 */
export async function getRecentMeetings(limit = 8) {
  return db.select().from(meetings).orderBy(desc(meetings.startedAt)).limit(limit);
}

/** The real job of this page: "what did I actually deliver this month?" */
export async function getActivityLog(month = monthStartISO()) {
  const monthEnd = `${month.slice(0, 7)}-31`;
  const sessions = await getSessionsBetween(month, monthEnd);
  const list = await getEngagements();
  const nameById = new Map(list.map((e) => [e.id, e.name]));

  return sessions
    .filter((s) => s.description)
    .map((s) => ({
      id: s.id,
      date: s.sessionDate,
      engagement: nameById.get(s.engagementId) ?? "—",
      minutes: s.minutes ?? 0,
      description: s.description ?? "",
    }));
}
