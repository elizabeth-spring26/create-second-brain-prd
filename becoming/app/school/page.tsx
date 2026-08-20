import { AssignmentRow } from "@/components/assignment-row";
import { SyncButton } from "@/components/sync-button";
import { Card, Empty, Eyebrow, PageHeader } from "@/components/ui";
import { getSyncState } from "@/lib/canvas/sync";
import { easternTime, shortDate, toLogDate } from "@/lib/dates";
import { getSettings } from "@/lib/queries/daily";
import { bucketOf, getAssignments, getMeetingFollowUps } from "@/lib/queries/school";

export const dynamic = "force-dynamic";

const BUCKET_TITLES = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  done: "Done",
} as const;

export default async function SchoolPage() {
  const now = new Date();
  const [settings, allRows, followUps, canvasState] = await Promise.all([
    getSettings(),
    getAssignments(),
    getMeetingFollowUps(4),
    getSyncState("canvas"),
  ]);

  // Canvas is hidden until the new term starts; hidden courses stay out too.
  const rows = settings?.showCanvas ? allRows.filter((r) => !r.courseHidden) : [];

  const buckets: Record<string, typeof rows> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    done: [],
  };
  for (const r of rows) buckets[bucketOf(r.dueAt, r.submittedAt, now)].push(r);

  // "This week: 6 due, ~4h estimated"
  const weekish = [...buckets.overdue, ...buckets.today, ...buckets.week];
  const estMinutes = weekish.reduce((s, r) => s + (r.estMinutes ?? 0), 0);
  const estHours = Math.round((estMinutes / 60) * 10) / 10;

  return (
    <div className="max-w-[860px]">
      <PageHeader
        title="School"
        subtitle={
          rows.length === 0
            ? "Nothing synced yet."
            : `This week: ${weekish.length} due, ~${estHours}h estimated`
        }
        action={<SyncButton provider="canvas" />}
      />

      {canvasState?.lastError ? (
        <Card className="mb-8">
          <p className="text-caption">
            Canvas didn&rsquo;t respond
            {canvasState.lastSuccessAt
              ? ` — your last sync was ${easternTime(canvasState.lastSuccessAt)} on ${shortDate(toLogDate(canvasState.lastSuccessAt))}`
              : " and there's no successful sync yet"}
            . {canvasState.lastError}
          </p>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <Empty>
            {settings?.showCanvas
              ? "Nothing due. Hit sync and your active Canvas courses will land here."
              : "Canvas is off while your new schedule hasn't started. Turn it back on in settings when term begins — syncing keeps running in the background, so nothing is lost."}
          </Empty>
        </Card>
      ) : (
        (["overdue", "today", "week", "later", "done"] as const).map((b) =>
          buckets[b].length === 0 ? null : (
            <section key={b} className="mb-12">
              <Eyebrow className="mb-2" >
                {BUCKET_TITLES[b]} · {buckets[b].length}
              </Eyebrow>
              <div>
                {buckets[b].map((r) => (
                  <AssignmentRow
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    courseName={r.courseName}
                    courseColor={r.courseColor}
                    dueLabel={r.dueAt ? shortDate(toLogDate(r.dueAt)) : "No date"}
                    isOverdue={b === "overdue"}
                    points={r.pointsPossible}
                    myStatus={r.myStatus}
                    myPriority={r.myPriority}
                    estMinutes={r.estMinutes}
                    htmlUrl={r.htmlUrl}
                  />
                ))}
              </div>
            </section>
          ),
        )
      )}

      {/* Granola follow-ups sit beside assignments — same kind of obligation. */}
      <section className="mt-16">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Eyebrow>Meeting follow-ups</Eyebrow>
          <SyncButton provider="granola" label="Sync Granola" />
        </div>

        {followUps.length === 0 ? (
          <Card>
            <Empty>
              No open follow-ups. Sync Granola and anything with next steps shows up here.
            </Empty>
          </Card>
        ) : (
          <div className="space-y-4">
            {followUps.map((m) => (
              <Card key={m.id}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-subheading">{m.title}</p>
                  <span className="font-mono text-eyebrow text-ink-soft">
                    {m.startedAt ? shortDate(toLogDate(m.startedAt)) : ""}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {m.items.map((i, idx) => (
                    <li key={idx} className="flex gap-2 text-caption">
                      <span className="text-ink-soft">→</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
