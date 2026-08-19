import { OfferMatrix } from "@/components/offer-matrix";
import { Card, Empty, Eyebrow, PageHeader, Stat } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { funnel, needsAttention } from "@/lib/career-math";
import { getApplications, getOffersWithScores } from "@/lib/queries/career";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone screen",
  interviewing: "Interviewing",
  final: "Final",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  accepted: "Accepted",
};

export default async function CareerPage() {
  const today = todayISO();
  const [apps, { offers, criteria, scoreMap }] = await Promise.all([
    getApplications(),
    getOffersWithScores(),
  ]);

  const f = funnel(apps);
  const stale = needsAttention(apps, today);
  const initialScores = Object.fromEntries(scoreMap);

  return (
    <div className="max-w-[900px]">
      <PageHeader title="Career" subtitle="Where every application actually stands." />

      {/* Funnel */}
      <Card className="mb-10">
        <Eyebrow className="mb-5">Pipeline</Eyebrow>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Applied" value={f.applied} />
          <Stat
            label="Screens"
            value={f.screens}
            hint={f.screenRate !== null ? `${f.screenRate}% of applied` : undefined}
          />
          <Stat
            label="Interviews"
            value={f.interviews}
            hint={f.interviewRate !== null ? `${f.interviewRate}% of screens` : undefined}
          />
          <Stat
            label="Offers"
            value={f.offers}
            hint={f.offerRate !== null ? `${f.offerRate}% of interviews` : undefined}
          />
        </div>
      </Card>

      {stale.length > 0 ? (
        <Card className="mb-10">
          <Eyebrow className="mb-3">Needs attention</Eyebrow>
          <ul className="space-y-1.5">
            {stale.map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-caption">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: "var(--amber)" }}
                />
                {a.company} · {a.role} — applied {a.appliedOn}, no next step
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Applications */}
      <section className="mb-16">
        <Eyebrow className="mb-5">Applications</Eyebrow>
        {apps.length === 0 ? (
          <Card>
            <Empty>
              Nothing tracked yet. Add the roles you&rsquo;ve applied to and the funnel above
              starts telling you something.
            </Empty>
          </Card>
        ) : (
          <div>
            {apps.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-haze py-4"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="text-body">
                    {a.company} · <span className="text-ink-soft">{a.role}</span>
                  </p>
                  {a.nextStep ? (
                    <p className="text-eyebrow text-ink-soft">
                      Next: {a.nextStep}
                      {a.nextStepDate ? ` · ${a.nextStepDate}` : ""}
                    </p>
                  ) : null}
                </div>
                <span className="text-eyebrow text-ink-soft">
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                <span className="font-mono text-eyebrow text-ink-soft">
                  {a.appliedOn ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The decision */}
      <section>
        <Eyebrow className="mb-5">The decision</Eyebrow>
        <OfferMatrix
          offers={offers}
          criteria={criteria.map((c) => ({ id: c.id, label: c.label, weight: c.weight }))}
          initialScores={initialScores}
          todayISO={today}
        />
      </section>
    </div>
  );
}
