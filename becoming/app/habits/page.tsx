import { HabitEditor, type EditableHabit } from "@/components/habit-editor";
import { PageHeader } from "@/components/ui";
import { addDaysISO, lastNDates, todayISO } from "@/lib/dates";
import { getActiveHabits, getHabitLogs } from "@/lib/queries/daily";
import { bestStreak, consistency, currentStreak } from "@/lib/streaks";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 84; // 12 weeks

export default async function HabitsPage() {
  const today = todayISO();
  const since = addDaysISO(today, -(WINDOW_DAYS - 1));
  const dates = lastNDates(WINDOW_DAYS, today);

  const habits = await getActiveHabits();
  const logs = await getHabitLogs(
    habits.map((h) => h.id),
    since,
    today,
  );

  const byHabit = new Map<string, string[]>();
  for (const h of habits) byHabit.set(h.id, []);
  for (const l of logs) byHabit.get(l.habitId)?.push(l.logDate);

  const toEditable = (h: (typeof habits)[number]): EditableHabit => {
    const d = byHabit.get(h.id) ?? [];
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      direction: h.direction,
      pinned: h.pinned,
      loggedDates: d,
      current: currentStreak(h.direction, d, today),
      best: bestStreak(h.direction, d, since, today),
      pct: Math.round(consistency(h.direction, d, 30, today) * 100),
    };
  };

  return (
    <div className="max-w-[820px]">
      <PageHeader
        title="Habits"
        subtitle="Consistency, not perfection. Click any square to fill in a day."
      />
      <HabitEditor
        build={habits.filter((h) => h.direction === "build").map(toEditable)}
        brk={habits.filter((h) => h.direction === "break").map(toEditable)}
        dates={dates}
        todayISO={today}
      />
    </div>
  );
}
