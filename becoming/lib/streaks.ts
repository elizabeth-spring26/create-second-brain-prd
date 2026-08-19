import { addDaysISO, todayISO } from "./dates";

/**
 * Streak and consistency math.
 *
 * Build habits: a day counts when it was logged.
 * Break habits: a day counts when it was NOT logged — logging a break habit
 * means the thing happened. Slips are never tallied anywhere; we only ever
 * count clean days upward.
 */

export type Direction = "build" | "break";

/** Days a habit counts as "kept", given the set of dates it was logged on. */
function isClean(direction: Direction, logged: Set<string>, iso: string): boolean {
  return direction === "build" ? logged.has(iso) : !logged.has(iso);
}

/**
 * Current run of kept days ending today (or yesterday — today isn't a broken
 * streak just because it hasn't happened yet, which would punish her at 9am).
 */
export function currentStreak(
  direction: Direction,
  loggedDates: string[],
  today: string = todayISO(),
): number {
  const logged = new Set(loggedDates);

  // A build habit not yet logged today is still mid-streak; start from yesterday.
  let cursor = today;
  if (direction === "build" && !logged.has(today)) {
    cursor = addDaysISO(today, -1);
  }

  let streak = 0;
  // Guard against an unbounded walk on an empty history.
  for (let i = 0; i < 3650; i++) {
    if (!isClean(direction, logged, cursor)) break;
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/**
 * Longest run of kept days. For break habits this needs a bounded window,
 * since "not logged" is true for all of prehistory — we start from the first
 * date the habit could have been tracked.
 */
export function bestStreak(
  direction: Direction,
  loggedDates: string[],
  since: string,
  today: string = todayISO(),
): number {
  const logged = new Set(loggedDates);
  let best = 0;
  let run = 0;
  let cursor = since;

  for (let i = 0; i < 3650 && cursor <= today; i++) {
    if (isClean(direction, logged, cursor)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    cursor = addDaysISO(cursor, 1);
  }
  return best;
}

/** Share of the last `days` days that were kept, as 0–1. */
export function consistency(
  direction: Direction,
  loggedDates: string[],
  days = 30,
  today: string = todayISO(),
): number {
  const logged = new Set(loggedDates);
  let kept = 0;
  for (let i = 0; i < days; i++) {
    if (isClean(direction, logged, addDaysISO(today, -i))) kept++;
  }
  return kept / days;
}
