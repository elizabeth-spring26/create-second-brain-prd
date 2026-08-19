import "server-only";
import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { calendarEvents, dailyCheckins, habitLogs, habits } from "@/db/schema";
import { addDaysISO, todayISO, toLogDate } from "@/lib/dates";
import { bedtimeMinutes, mean, pearson, stdev } from "@/lib/stats";

const WINDOW = 90;

export type Insight = {
  key: string;
  title: string;
  n: number;
  /** Rendered only when n >= MIN_N. */
  body: string | null;
  points?: { x: number; y: number }[];
  r?: number | null;
};

export async function getInsights() {
  const today = todayISO();
  const from = addDaysISO(today, -(WINDOW - 1));

  const checkins = await db
    .select()
    .from(dailyCheckins)
    .where(and(gte(dailyCheckins.logDate, from), lte(dailyCheckins.logDate, today)))
    .orderBy(dailyCheckins.logDate);

  const energyOf = (c: (typeof checkins)[number]) => c.energyEvening ?? c.energyMorning ?? null;
  const byDate = new Map(checkins.map((c) => [c.logDate, c]));

  const insights: Insight[] = [];

  /* ── Sleep → next-day energy ────────────────────────────────────────────── */
  const sleepX: number[] = [];
  const energyY: number[] = [];
  for (const c of checkins) {
    if (c.sleepHours == null) continue;
    const next = byDate.get(addDaysISO(c.logDate, 1));
    const e = next ? energyOf(next) : null;
    if (e == null) continue;
    sleepX.push(c.sleepHours);
    energyY.push(e);
  }
  const r = pearson(sleepX, energyY);
  insights.push({
    key: "sleep-energy",
    title: "Sleep → next-day energy",
    n: sleepX.length,
    r,
    points: sleepX.map((x, i) => ({ x, y: energyY[i] })),
    body:
      r === null
        ? null
        : `Across ${sleepX.length} nights, the correlation between how long you slept and your energy the next day is r = ${r}.`,
  });

  /* ── Bedtime consistency ────────────────────────────────────────────────── */
  const bedtimes = checkins
    .map((c) => c.bedTime)
    .filter((b): b is string => Boolean(b))
    .map(bedtimeMinutes);
  const sd = stdev(bedtimes);
  insights.push({
    key: "bedtime-spread",
    title: "Bedtime consistency",
    n: bedtimes.length,
    body:
      bedtimes.length === 0
        ? null
        : `Your bedtime swings by about ${describeSpread(sd)} either side of your usual.`,
  });

  /* ── Gym days vs non-gym days ───────────────────────────────────────────── */
  const gym = (await db.select().from(habits)).find((h) =>
    /gym|workout/i.test(h.name),
  );
  if (gym) {
    const logs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.logDate, from), lte(habitLogs.logDate, today)));
    const gymDays = new Set(logs.filter((l) => l.habitId === gym.id).map((l) => l.logDate));

    const on: number[] = [];
    const off: number[] = [];
    for (const c of checkins) {
      const e = energyOf(c);
      if (e == null) continue;
      (gymDays.has(c.logDate) ? on : off).push(e);
    }
    const n = on.length + off.length;
    insights.push({
      key: "gym-energy",
      title: "Gym days vs the rest",
      n,
      body:
        on.length === 0 || off.length === 0
          ? null
          : `Energy averages ${round(mean(on))} on gym days and ${round(mean(off))} on days without. (${on.length} vs ${off.length} days.)`,
    });
  }

  /* ── Event density vs energy ────────────────────────────────────────────── */
  const events = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        gte(calendarEvents.startsAt, new Date(`${from}T00:00:00Z`)),
        lte(calendarEvents.startsAt, new Date(`${today}T23:59:59Z`)),
      ),
    );
  const perDay = new Map<string, number>();
  for (const e of events) {
    const iso = e.allDayDate ?? (e.startsAt ? toLogDate(e.startsAt) : null);
    if (iso) perDay.set(iso, (perDay.get(iso) ?? 0) + 1);
  }
  const dx: number[] = [];
  const dy: number[] = [];
  for (const c of checkins) {
    const e = energyOf(c);
    if (e == null) continue;
    dx.push(perDay.get(c.logDate) ?? 0);
    dy.push(e);
  }
  const rDensity = pearson(dx, dy);
  insights.push({
    key: "event-density",
    title: "Busy days vs energy",
    n: dx.length,
    r: rDensity,
    body:
      rDensity === null
        ? null
        : `Correlation between number of calendar events in a day and that day's energy: r = ${rDensity}.`,
  });

  /* ── Break-habit clean days vs energy ───────────────────────────────────── */
  const breaks = (await db.select().from(habits)).filter((h) => h.direction === "break");
  if (breaks.length > 0) {
    const logs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.logDate, from), lte(habitLogs.logDate, today)));
    const breakIds = new Set(breaks.map((b) => b.id));
    const slipDays = new Set(
      logs.filter((l) => breakIds.has(l.habitId)).map((l) => l.logDate),
    );

    const clean: number[] = [];
    const slipped: number[] = [];
    for (const c of checkins) {
      const e = energyOf(c);
      if (e == null) continue;
      (slipDays.has(c.logDate) ? slipped : clean).push(e);
    }
    insights.push({
      key: "break-clean",
      title: "Clean days vs the others",
      n: clean.length + slipped.length,
      body:
        clean.length === 0 || slipped.length === 0
          ? null
          : `Energy averages ${round(mean(clean))} on clean days and ${round(mean(slipped))} on days you slipped. (${clean.length} vs ${slipped.length} days.)`,
    });
  }

  /* ── Best and worst day of week ─────────────────────────────────────────── */
  const dow = new Map<number, number[]>();
  for (const c of checkins) {
    const e = energyOf(c);
    if (e == null) continue;
    const d = new Date(`${c.logDate}T12:00:00`).getDay();
    if (!dow.has(d)) dow.set(d, []);
    dow.get(d)!.push(e);
  }
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ranked = [...dow.entries()]
    .map(([d, xs]) => ({ d, avg: mean(xs), n: xs.length }))
    .sort((a, b) => b.avg - a.avg);
  const totalDow = ranked.reduce((s, x) => s + x.n, 0);
  insights.push({
    key: "day-of-week",
    title: "Best and worst day",
    n: totalDow,
    body:
      ranked.length < 2
        ? null
        : `${names[ranked[0].d]} averages your highest energy at ${round(ranked[0].avg)}; ${names[ranked[ranked.length - 1].d]} your lowest at ${round(ranked[ranked.length - 1].avg)}.`,
  });

  return insights;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function describeSpread(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h === 0 ? `${m} minutes` : `${h}h${String(m).padStart(2, "0")}m`;
}
