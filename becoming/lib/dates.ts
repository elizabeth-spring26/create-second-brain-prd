import { addDays, differenceInMinutes, format, parseISO, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./config";

/**
 * Everything in this app is Eastern. A "log date" is always the YYYY-MM-DD that
 * Elizabeth would call that day in New York, never a UTC calendar day — those
 * disagree for five hours every night and that gap is where off-by-one-day bugs
 * live.
 */

/** Today's log date in Eastern. */
export function todayISO(now: Date = new Date()): string {
  return formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
}

/** The Eastern log date for any instant. */
export function toLogDate(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}

/** Shift a log date by whole days, staying in Eastern. */
export function addDaysISO(iso: string, days: number): string {
  return format(addDays(parseISO(`${iso}T12:00:00`), days), "yyyy-MM-dd");
}

/** The last `n` log dates, oldest first, ending today. */
export function lastNDates(n: number, endISO: string = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysISO(endISO, -i));
  return out;
}

/** Monday that starts the week containing `iso`. */
export function weekStartISO(iso: string = todayISO()): string {
  const d = parseISO(`${iso}T12:00:00`);
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** YYYY-MM-01 for the month containing `iso`. */
export function monthStartISO(iso: string = todayISO()): string {
  return `${iso.slice(0, 7)}-01`;
}

/** "Wednesday, August 19" */
export function prettyDate(iso: string): string {
  return format(parseISO(`${iso}T12:00:00`), "EEEE, MMMM d");
}

/** "Aug 19" */
export function shortDate(iso: string): string {
  return format(parseISO(`${iso}T12:00:00`), "MMM d");
}

/** Eastern wall-clock hour right now, for deciding morning vs evening check-in. */
export function easternHour(now: Date = new Date()): number {
  return Number(formatInTimeZone(now, TIMEZONE, "H"));
}

/** Convert an Eastern wall-clock datetime to a real instant. */
export function easternToInstant(iso: string, time: string): Date {
  return fromZonedTime(`${iso}T${time}:00`, TIMEZONE);
}

/** Render an instant as Eastern wall-clock time, e.g. "2:45 PM". */
export function easternTime(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "h:mm a");
}

export function instantToEastern(d: Date): Date {
  return toZonedTime(d, TIMEZONE);
}

/**
 * Hours between a bed time and a wake time, handling the usual case where bed
 * is before midnight and wake is the next morning.
 */
export function sleepHoursBetween(bedTime: string, wakeTime: string): number {
  const [bh, bm] = bedTime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

/** Minutes between two instants, floored at 0. */
export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, differenceInMinutes(b, a));
}
