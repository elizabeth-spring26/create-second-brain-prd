import { WeeklyReviewForm } from "@/components/weekly-review-form";
import { Card, Empty, Eyebrow, Meter, PageHeader, Stat } from "@/components/ui";
import { monthStartISO, shortDate, weekStartISO } from "@/lib/dates";
import {
  getMonthlyGoals,
  getPreviousReview,
  getRecentReviews,
  getWeekStats,
  getWeeklyReview,
} from "@/lib/queries/reflect";

export const dynamic = "force-dynamic";

export default async function ReflectPage() {
  const weekStart = weekStartISO();
  const [review, prev, stats, goals, recent] = await Promise.all([
    getWeeklyReview(weekStart),
    getPreviousReview(weekStart),
    getWeekStats(weekStart),
    getMonthlyGoals(),
    getRecentReviews(6),
  ]);

  const lastWeek = recent.find((r) => r.weekStart !== weekStart) ?? null;

  return (
    <div className="max-w-[720px]">
      <PageHeader
        title="Reflect"
        subtitle={`Week of ${shortDate(stats.weekStart)} – ${shortDate(stats.weekEnd)}`}
      />

      {/* Real numbers first — she reflects against them, not in a vacuum. */}
      <Card className="mb-14">
        <Eyebrow className="mb-5">This week, so far</Eyebrow>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat
            label="Sleep"
            value={stats.sleepAvg === null ? "—" : `${stats.sleepAvg}h`}
            hint={`${stats.daysLogged}/7 logged`}
          />
          <Stat label="Energy" value={stats.energyAvg === null ? "—" : `${stats.energyAvg}`} />
          <Stat
            label="Habits"
            value={stats.habitPct === null ? "—" : `${stats.habitPct}%`}
          />
          <Stat label="Hours" value={`${stats.hoursWorked}h`} />
        </div>
        {lastWeek?.computedSleepAvg != null && stats.sleepAvg != null ? (
          <p className="mt-6 text-caption text-ink-soft">
            Last week you averaged {lastWeek.computedSleepAvg}h of sleep and{" "}
            {lastWeek.computedEnergyAvg ?? "—"} energy.
          </p>
        ) : null}
      </Card>

      <WeeklyReviewForm
        weekStart={weekStart}
        initial={review}
        lastChange={prev?.oneChangeNextWeek ?? null}
      />

      {/* ── Monthly goals ─────────────────────────────────────────────────── */}
      <section className="mt-20">
        <Eyebrow className="mb-5">This month</Eyebrow>
        {goals.length === 0 ? (
          <Card>
            <Empty>
              No goals set for {monthStartISO().slice(0, 7)} yet. Three to five is usually
              the right number.
            </Empty>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <Card key={g.id}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-subheading">{g.title}</p>
                  <p className="font-mono text-eyebrow text-ink-soft">
                    {g.targetValue != null
                      ? `${g.currentValue} / ${g.targetValue}${g.metricLabel ? ` ${g.metricLabel}` : ""}`
                      : g.status}
                  </p>
                </div>
                {g.targetValue != null ? (
                  <Meter value={g.currentValue} max={g.targetValue} />
                ) : null}
                {g.whyItMatters ? (
                  <p className="mt-4 font-reflective text-caption italic text-ink-soft">
                    {g.whyItMatters}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Past reviews ──────────────────────────────────────────────────── */}
      {recent.length > 0 ? (
        <section className="mt-16">
          <Eyebrow className="mb-5">Past weeks</Eyebrow>
          <div className="space-y-3">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-haze pb-3"
              >
                <span className="font-mono text-caption">{shortDate(r.weekStart)}</span>
                <span className="text-caption text-ink-soft">
                  {r.oneChangeNextWeek ?? "—"}
                </span>
                <span className="font-mono text-eyebrow text-ink-soft">
                  {r.weekRating ? `${r.weekRating}/5` : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
