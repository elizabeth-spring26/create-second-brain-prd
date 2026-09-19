import { ApplicationBoard, type ApplicationRow } from "@/components/application-board";
import { OfferMatrix } from "@/components/offer-matrix";
import { Card, Eyebrow, PageHeader, Stat } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { funnel, needsAttention } from "@/lib/career-math";
import { getApplications, getOffersWithScores } from "@/lib/queries/career";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const today = todayISO();
  const [apps, { offers, criteria, scoreMap }] = await Promise.all([
    getApplications(),
    getOffersWithScores(),
  ]);

  const strip = (a: (typeof apps)[number]): ApplicationRow => ({
    id: a.id,
    company: a.company,
    role: a.role,
    status: a.status,
    appliedOn: a.appliedOn,
    postingUrl: a.postingUrl,
    nextStep: a.nextStep,
    nextStepDate: a.nextStepDate,
  });

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
        <ApplicationBoard applications={apps.map(strip)} />
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
