import "server-only";
import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { CATEGORY_TOKENS, type EventCategory } from "@/lib/config";
import { monthStartISO, toLogDate } from "@/lib/dates";

export async function getEventsInMonth(month = monthStartISO()) {
  const start = new Date(`${month}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.startsAt, start), lte(calendarEvents.startsAt, end)))
    .orderBy(calendarEvents.startsAt);
}

export type Balance = {
  category: EventCategory;
  hours: number;
  token: string;
};

/** Hours per category this month, for the stacked balance strip. */
export function balanceOf(
  events: { category: string; startsAt: Date | null; endsAt: Date | null }[],
): Balance[] {
  const totals = new Map<string, number>();
  for (const e of events) {
    if (!e.startsAt || !e.endsAt) continue;
    const hours = (e.endsAt.getTime() - e.startsAt.getTime()) / 3600000;
    if (hours <= 0 || hours > 24) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + hours);
  }

  return (Object.keys(CATEGORY_TOKENS) as EventCategory[])
    .map((category) => ({
      category,
      hours: Math.round((totals.get(category) ?? 0) * 10) / 10,
      token: CATEGORY_TOKENS[category],
    }))
    .filter((b) => b.hours > 0);
}

/** Group events by their Eastern log date, for the month grid. */
export function groupByDate(events: { startsAt: Date | null; allDayDate: string | null }[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    const iso = e.allDayDate ?? (e.startsAt ? toLogDate(e.startsAt) : null);
    if (!iso) continue;
    map.set(iso, (map.get(iso) ?? 0) + 1);
  }
  return map;
}
