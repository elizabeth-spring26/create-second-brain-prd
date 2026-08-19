import { CheckinCard } from "@/components/checkin-card";
import { HabitRow, type HabitItem } from "@/components/habit-row";
import { Card, Empty, Eyebrow } from "@/components/ui";
import {
  getActiveHabits,
  getActiveMonthlyGoals,
  getCheckin,
  getHabitLogsForDate,
  getSettings,
} from "@/lib/queries/daily";
import { easternHour, prettyDate, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * A line derived from her own active goals — not a generic quote API.
 * Rotates by day so it changes without being random on every render.
 */
function becomingLine(goalTitles: string[], iso: string): string {
  if (goalTitles.length === 0) {
    return "Set a goal for this month and this line becomes yours.";
  }
  const seed = Number(iso.replaceAll("-", "")) % goalTitles.length;
  return `You're becoming someone who ${goalTitles[seed].toLowerCase()}.`;
}

export default async function TodayPage() {
  const logDate = todayISO();
  const hour = easternHour();

  const [settings, checkin, habits, todaysLogs, goals] = await Promise.all([
    getSettings(),
    getCheckin(logDate),
    getActiveHabits(),
    getHabitLogsForDate(logDate),
    getActiveMonthlyGoals(),
  ]);

  const loggedIds = new Set(todaysLogs.map((l) => l.habitId));
  const habitItems: HabitItem[] = habits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    direction: h.direction,
    logged: loggedIds.has(h.id),
  }));

  // Before 3pm the morning pass is the useful one.
  const defaultMode = hour < 15 ? "morning" : "evening";

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-display">{prettyDate(logDate)}</h1>
      <p className="mt-3 font-reflective text-subheading italic text-ink-soft">
        {becomingLine(
          goals.map((g) => g.title),
          logDate,
        )}
      </p>

      <div className="mt-12 space-y-8">
        <CheckinCard
          logDate={logDate}
          initial={checkin}
          defaultMode={defaultMode}
          bedGoal={settings?.bedGoal ?? null}
          wakeGoal={settings?.wakeGoal ?? null}
        />

        <Card>
          <Eyebrow className="mb-5">Habits</Eyebrow>
          <HabitRow habits={habitItems} logDate={logDate} />
        </Card>

        <Card>
          <Eyebrow className="mb-3">Today at a glance</Eyebrow>
          <Empty>
            Calendar events, assignments due, and hours logged land here once those
            integrations are connected.
          </Empty>
        </Card>
      </div>
    </div>
  );
}
