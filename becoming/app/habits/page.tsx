import { HabitHeatmap } from "@/components/habit-heatmap";
import { Card, Empty, Eyebrow, PageHeader, Stat } from "@/components/ui";
import { addDaysISO, todayISO } from "@/lib/dates";
import { getActiveHabits, getHabitLogs } from "@/lib/queries/daily";
import { bestStreak, consistency, currentStreak } from "@/lib/streaks";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 84; // 12 weeks

export default async function HabitsPage() {
  const today = todayISO();
  const since = addDaysISO(today, -(WINDOW_DAYS - 1));
  const habits = await getActiveHabits();
  const logs = await getHabitLogs(
    habits.map((h) => h.id),
    since,
    today,
  );

  const byHabit = new Map<string, string[]>();
  for (const h of habits) byHabit.set(h.id, []);
  for (const l of logs) byHabit.get(l.habitId)?.push(l.logDate);

  const build = habits.filter((h) => h.direction === "build");
  const brk = habits.filter((h) => h.direction === "break");

  function render(h: (typeof habits)[number]) {
    const dates = byHabit.get(h.id) ?? [];
    const cur = currentStreak(h.direction, dates, today);
    const best = bestStreak(h.direction, dates, since, today);
    const pct = Math.round(consistency(h.direction, dates, 30, today) * 100);

    return (
      <Card key={h.id}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {h.emoji ? <span className="text-heading leading-none">{h.emoji}</span> : null}
            <div>
              <p className="text-subheading">{h.name}</p>
              <p className="text-eyebrow text-ink-soft">
                {h.direction === "break" ? "Clean days counted up" : "Build"}
              </p>
            </div>
          </div>
          <div className="flex gap-8">
            <Stat label="Current" value={`${cur}d`} />
            <Stat label="Best" value={`${best}d`} />
            <Stat label="30-day" value={`${pct}%`} />
          </div>
        </div>
        <HabitHeatmap loggedDates={dates} direction={h.direction} />
      </Card>
    );
  }

  return (
    <div className="max-w-[760px]">
      <PageHeader title="Habits" subtitle="Consistency, not perfection." />

      {habits.length === 0 ? (
        <Card>
          <Empty>Nothing here yet — seed a few habits and they&rsquo;ll show up.</Empty>
        </Card>
      ) : null}

      {build.length > 0 ? (
        <section className="mb-14">
          <Eyebrow className="mb-5">What you&rsquo;re building</Eyebrow>
          <div className="space-y-4">{build.map(render)}</div>
        </section>
      ) : null}

      {brk.length > 0 ? (
        <section>
          <Eyebrow className="mb-5">What you&rsquo;re letting go of</Eyebrow>
          <div className="space-y-4">{brk.map(render)}</div>
          <p className="mt-4 text-eyebrow text-ink-soft">
            These count clean days upward. A slip just ends a run — it&rsquo;s never tallied
            against you.
          </p>
        </section>
      ) : null}
    </div>
  );
}
