import Link from "next/link";
import { CheckinCard } from "@/components/checkin-card";
import { HabitRow, type HabitItem } from "@/components/habit-row";
import { MonthlyGoalsList } from "@/components/monthly-goals";
import { WeekBoard, type Task } from "@/components/week-board";
import { affirmationFor, reflectionFor } from "@/lib/affirmations";
import { easternHour, prettyDate, todayISO } from "@/lib/dates";
import {
  getActiveHabits,
  getCheckin,
  getHabitLogsForDate,
  getSettings,
} from "@/lib/queries/daily";
import { getMonthlyGoals } from "@/lib/queries/reflect";
import { getWeekTasks, getWeeklyGoals } from "@/lib/queries/tasks";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const logDate = todayISO();
  const hour = easternHour();

  const [settings, checkin, habits, todaysLogs, week, weeklyGoals] = await Promise.all([
    getSettings(),
    getCheckin(logDate),
    getActiveHabits(),
    getHabitLogsForDate(logDate),
    getWeekTasks(logDate),
    getWeeklyGoals(logDate),
  ]);

  const monthGoals = await getMonthlyGoals();
  const sidebarGoals = monthGoals.map((g) => ({
    id: g.id,
    title: g.title,
    done: g.status === "hit",
  }));

  const loggedIds = new Set(todaysLogs.map((l) => l.habitId));
  const toItem = (h: (typeof habits)[number]): HabitItem => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    direction: h.direction,
    logged: loggedIds.has(h.id),
  });

  // Today shows only the pinned few. Falls back to the first four so the
  // screen is never empty before anything has been pinned.
  const pinned = habits.filter((h) => h.pinned);
  const shown = (pinned.length > 0 ? pinned : habits.slice(0, 4)).map(toItem);
  const hiddenCount = habits.length - shown.length;

  const affirmation = affirmationFor(logDate);
  const reflection = reflectionFor(logDate);

  const strip = (t: {
    id: string;
    title: string;
    source: "manual" | "canvas" | "granola";
    dueDate: string | null;
    done: boolean;
    url: string | null;
  }): Task => ({
    id: t.id,
    title: t.title,
    source: t.source,
    dueDate: t.dueDate,
    done: t.done,
    url: t.url,
  });

  const byDay: Record<string, Task[]> = {};
  for (const [d, list] of week.byDay) byDay[d] = list.map(strip);

  const done = shown.filter((h) =>
    h.direction === "break" ? !h.logged : h.logged,
  ).length;

  return (
    <div className="max-w-[900px]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="eyebrow mb-2">
          {hour < 12 ? "Good morning" : hour < 18 ? "Afternoon" : "Evening"}, Elizabeth
        </p>
        <h1 className="font-display text-display">{prettyDate(logDate)}</h1>
      </div>

      {/* ── Affirmation ──────────────────────────────────────────────────── */}
      <div
        className="card-cel mb-4"
        style={{ background: "color-mix(in oklab, var(--sakura) 22%, var(--card))" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <svg width="12" height="12" viewBox="-5 -5 10 10" aria-hidden="true">
            <path
              d="M 0 -5 Q 0.9 -0.9 5 0 Q 0.9 0.9 0 5 Q -0.9 0.9 -5 0 Q -0.9 -0.9 0 -5 Z"
              fill="var(--ink)"
            />
          </svg>
          <span className="eyebrow">Say it out loud</span>
        </div>
        <p className="font-reflective text-heading italic leading-snug">
          &ldquo;{affirmation.text}&rdquo;
        </p>
        <p className="mt-3 text-[0.7rem] text-ink-soft">
          From your session on {affirmation.source}
        </p>
      </div>

      {/* ── Reflection of the day ────────────────────────────────────────── */}
      <div className="card-cel mb-10">
        <p className="eyebrow mb-3">Something to sit with</p>
        <p className="font-reflective text-subheading italic leading-snug">
          {reflection.text}
        </p>
        <p className="mt-3 text-[0.7rem] text-ink-soft">
          From your session on {reflection.source}
        </p>
      </div>

      {/* ── The week ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="font-display text-heading mb-4">This week</h2>
        <WeekBoard
          days={week.days}
          byDay={byDay}
          undated={week.undated.map(strip)}
          laterThisMonth={week.laterThisMonth.map(strip)}
          weeklyGoals={weeklyGoals.map(strip)}
          todayISO={logDate}
        />
      </section>

      {/* Monthly goals live in the left rail, which is hidden below 1024px —
          this card makes them reachable on a narrow window or a phone. */}
      <section className="mb-12 lg:hidden">
        <h2 className="font-display text-heading mb-4">Monthly goals</h2>
        <div className="card-cel">
          <MonthlyGoalsList goals={sidebarGoals} />
        </div>
      </section>

      {/* ── Habits ───────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-heading">Today&rsquo;s habits</h2>
          <span className="cel-pill font-mono">
            {done}/{shown.length}
          </span>
        </div>
        <div className="card-cel">
          <HabitRow habits={shown} logDate={logDate} />
          {hiddenCount > 0 ? (
            <p className="mt-5 text-[0.75rem] text-ink-soft">
              <Link href="/habits" className="underline underline-offset-2 hover:text-ink">
                {hiddenCount} more on the habits page
              </Link>{" "}
              — pin the ones you want here.
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Check-in ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-heading mb-4">
          {hour < 15 ? "This morning" : "Tonight"}
        </h2>
        <CheckinCard
          logDate={logDate}
          initial={checkin}
          defaultMode={hour < 15 ? "morning" : "evening"}
          bedGoal={settings?.bedGoal ?? null}
          wakeGoal={settings?.wakeGoal ?? null}
        />
      </section>
    </div>
  );
}
