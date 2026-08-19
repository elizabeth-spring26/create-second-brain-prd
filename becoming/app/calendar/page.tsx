import { Card, Empty, Eyebrow, PageHeader } from "@/components/ui";
import { CATEGORY_TOKENS, type EventCategory } from "@/lib/config";
import { easternTime, monthStartISO, shortDate, toLogDate } from "@/lib/dates";
import { balanceOf, getEventsInMonth } from "@/lib/queries/calendar";
import { googleConfigured } from "@/lib/google/client";
import { getSyncState } from "@/lib/canvas/sync";

export const dynamic = "force-dynamic";

const LABELS: Record<EventCategory, string> = {
  networking: "Networking",
  friends_family: "Friends & family",
  self_care: "Self-care",
  gym: "Gym",
  work: "Work",
  school: "School",
  other: "Other",
};

export default async function CalendarPage() {
  const month = monthStartISO();
  const [events, state] = await Promise.all([
    getEventsInMonth(month),
    getSyncState("google_calendar"),
  ]);
  const balance = balanceOf(events);
  const totalHours = balance.reduce((s, b) => s + b.hours, 0);
  const selfCare = balance.find((b) => b.category === "self_care")?.hours ?? 0;
  const connected = Boolean(state?.refreshToken);

  return (
    <div className="max-w-[880px]">
      <PageHeader title="Calendar" subtitle={`${month.slice(0, 7)}`} />

      {!googleConfigured() ? (
        <Card className="mb-10">
          <Eyebrow className="mb-3">Not connected</Eyebrow>
          <p className="text-caption text-ink-soft">
            Add <span className="font-mono">GOOGLE_CLIENT_ID</span> and{" "}
            <span className="font-mono">GOOGLE_CLIENT_SECRET</span> to your env, then connect
            from settings. Everything else on this page works without it.
          </p>
        </Card>
      ) : !connected ? (
        <Card className="mb-10">
          <Eyebrow className="mb-3">Almost there</Eyebrow>
          <a href="/api/google/connect" className="btn-primary inline-block">
            Connect Google Calendar
          </a>
        </Card>
      ) : null}

      {/* Balance strip — one observation, warmly, never nagging. */}
      <Card className="mb-10">
        <Eyebrow className="mb-4">Where the month went</Eyebrow>
        {balance.length === 0 ? (
          <Empty>Nothing on the calendar yet this month.</Empty>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {balance.map((b) => (
                <div
                  key={b.category}
                  title={`${LABELS[b.category]} — ${b.hours}h`}
                  style={{
                    width: `${(b.hours / totalHours) * 100}%`,
                    background: `var(--${b.token})`,
                  }}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {balance.map((b) => (
                <span
                  key={b.category}
                  className="flex items-center gap-2 text-eyebrow text-ink-soft"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: `var(--${b.token})` }}
                  />
                  {LABELS[b.category]} · <span className="font-mono">{b.hours}h</span>
                </span>
              ))}
            </div>
            {selfCare < 4 && totalHours > 10 ? (
              <p className="mt-5 text-caption text-ink-soft">
                {selfCare === 0
                  ? "No self-care blocks this month yet."
                  : `${selfCare}h of self-care this month.`}{" "}
                Worth putting one on the calendar.
              </p>
            ) : null}
          </>
        )}
      </Card>

      <section>
        <Eyebrow className="mb-5">This month</Eyebrow>
        {events.length === 0 ? (
          <Card>
            <Empty>
              Once Google Calendar is connected, your events land here with a category
              colour each.
            </Empty>
          </Card>
        ) : (
          <div>
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-haze py-3"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background: `var(--${CATEGORY_TOKENS[e.category as EventCategory] ?? "haze"})`,
                  }}
                />
                <span className="font-mono text-eyebrow text-ink-soft">
                  {e.allDayDate
                    ? shortDate(e.allDayDate)
                    : e.startsAt
                      ? `${shortDate(toLogDate(e.startsAt))} ${easternTime(e.startsAt)}`
                      : "—"}
                </span>
                <span className="flex-1 text-caption">{e.title}</span>
                {e.location ? (
                  <span className="text-eyebrow text-ink-soft">{e.location}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
