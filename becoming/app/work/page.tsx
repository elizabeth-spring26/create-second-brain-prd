import { Card, Empty, Eyebrow, Meter, PageHeader, Stat } from "@/components/ui";
import { WorkTimer } from "@/components/work-timer";
import { monthStartISO, shortDate, toLogDate, weekStartISO } from "@/lib/dates";
import {
  getActivityLog,
  getEngagements,
  getMonthSummary,
  getRecentMeetings,
  getWeekByEngagement,
} from "@/lib/queries/work";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const [engagements, week, month, activity, meetings] = await Promise.all([
    getEngagements(),
    getWeekByEngagement(),
    getMonthSummary(),
    getActivityLog(),
    getRecentMeetings(6),
  ]);

  return (
    <div className="max-w-[820px]">
      <PageHeader
        title="Work"
        subtitle={`Week of ${shortDate(weekStartISO())}`}
      />

      <Card className="mb-10">
        <Eyebrow className="mb-5">Log time</Eyebrow>
        <WorkTimer engagements={engagements.map((e) => ({ id: e.id, name: e.name }))} />
      </Card>

      <Card className="mb-10">
        <Eyebrow className="mb-5">This week</Eyebrow>
        {week.length === 0 ? (
          <Empty>No engagements yet.</Empty>
        ) : (
          <div className="space-y-5">
            {week.map((e) => (
              <div key={e.id}>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="text-caption">{e.name}</span>
                  <span className="font-mono text-eyebrow text-ink-soft">
                    {e.hours}h{e.target ? ` / ${e.target}h` : ""}
                  </span>
                </div>
                <Meter value={e.hours} max={e.target ?? Math.max(e.hours, 1)} token={e.colorToken} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-10">
        <Eyebrow className="mb-5">{monthStartISO().slice(0, 7)}</Eyebrow>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Total" value={`${month.totalHours}h`} />
          <Stat label="Billable" value={`${month.billableHours}h`} />
          <Stat label="Non-billable" value={`${month.nonBillableHours}h`} />
          <Stat
            label="Est. value"
            value={month.estimatedValue > 0 ? `$${month.estimatedValue}` : "—"}
            hint={month.estimatedValue > 0 ? "from hourly rates" : "set a rate to see this"}
          />
        </div>
      </Card>

      {/* The real job of this page. */}
      <section className="mb-14">
        <Eyebrow className="mb-5">What you delivered this month</Eyebrow>
        {activity.length === 0 ? (
          <Card>
            <Empty>
              Nothing logged with a description yet. Add what you did when you stop the
              timer and this becomes the answer to &ldquo;what did I actually ship?&rdquo;
            </Empty>
          </Card>
        ) : (
          <div>
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-haze py-3"
              >
                <span className="font-mono text-eyebrow text-ink-soft">
                  {shortDate(a.date)}
                </span>
                <span className="flex-1 text-caption">{a.description}</span>
                <span className="text-eyebrow text-ink-soft">{a.engagement}</span>
                <span className="font-mono text-eyebrow text-ink-soft">
                  {Math.round((a.minutes / 60) * 10) / 10}h
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <Eyebrow className="mb-5">Recent meetings</Eyebrow>
        {meetings.length === 0 ? (
          <Card>
            <Empty>No Granola meetings synced yet.</Empty>
          </Card>
        ) : (
          <div>
            {meetings.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-haze py-3"
              >
                <span className="font-mono text-eyebrow text-ink-soft">
                  {m.startedAt ? shortDate(toLogDate(m.startedAt)) : "—"}
                </span>
                <span className="flex-1 text-caption">{m.title}</span>
                {m.folderName ? (
                  <span className="text-eyebrow text-ink-soft">{m.folderName}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
