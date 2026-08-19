import { SleepScatter } from "@/components/sleep-scatter";
import { Card, Eyebrow, PageHeader } from "@/components/ui";
import { getInsights } from "@/lib/queries/insights";
import { MIN_N } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Roughly how long until an insight has enough data to mean anything. */
function weeksAway(n: number) {
  const days = Math.max(0, MIN_N - n);
  const weeks = Math.ceil(days / 7);
  if (weeks <= 1) return "about a week";
  return `about ${weeks} more weeks`;
}

export default async function InsightsPage() {
  const insights = await getInsights();

  return (
    <div className="max-w-[760px]">
      <PageHeader
        title="Insights"
        subtitle="What your own logs say. Nothing more than that."
      />

      <div className="space-y-5">
        {insights.map((i) => {
          const ready = i.n >= MIN_N && i.body !== null;
          return (
            <Card key={i.key}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <Eyebrow>{i.title}</Eyebrow>
                <span className="font-mono text-eyebrow text-ink-soft">n = {i.n}</span>
              </div>

              {ready ? (
                <>
                  <p className="text-body">{i.body}</p>
                  {i.key === "sleep-energy" && i.points && i.points.length > 0 ? (
                    <div className="mt-6">
                      <SleepScatter points={i.points} />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-caption text-ink-soft">
                  Keep logging — {weeksAway(i.n)} until this one means anything.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-10 font-reflective text-caption italic text-ink-soft">
        These are observations about your own logged data over the last 90 days. They
        describe patterns, not causes, and nothing here is health advice.
      </p>
    </div>
  );
}
