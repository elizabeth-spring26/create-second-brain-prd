"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { setCriterionWeight, setGutCheck, setOfferScore } from "@/lib/actions/career";
import { sensitivity, weightedTotal, type Criterion } from "@/lib/career-math";
import { Card, Empty, Eyebrow } from "@/components/ui";

type Offer = {
  id: string;
  company: string;
  role: string;
  baseComp: string | null;
  otherComp: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  respondBy: string | null;
  gutCheck: string | null;
};

const SERIES_TOKENS = ["iris", "sakura", "matcha", "amber"];

function daysUntil(iso: string, todayISO: string) {
  const a = new Date(`${todayISO}T12:00:00`).getTime();
  const b = new Date(`${iso}T12:00:00`).getTime();
  return Math.round((b - a) / (24 * 3600 * 1000));
}

export function OfferMatrix({
  offers,
  criteria,
  initialScores,
  todayISO,
}: {
  offers: Offer[];
  criteria: Criterion[];
  initialScores: Record<string, number>;
  todayISO: string;
}) {
  const [, startTransition] = useTransition();
  const [scores, setScores] = useState(initialScores);
  const [weights, setWeights] = useState(
    Object.fromEntries(criteria.map((c) => [c.id, c.weight])),
  );

  const liveCriteria: Criterion[] = criteria.map((c) => ({ ...c, weight: weights[c.id] }));
  const scoreMap = useMemo(() => new Map(Object.entries(scores)), [scores]);

  const totals = offers.map((o) => ({
    offer: o,
    ...weightedTotal(o.id, liveCriteria, scoreMap),
  }));
  const ranked = [...totals].sort((a, b) => b.total - a.total);
  const sens = sensitivity(
    offers.map((o) => o.id),
    liveCriteria,
    scoreMap,
  );

  const radarData = liveCriteria.map((c) => {
    const row: Record<string, string | number> = { criterion: c.label };
    for (const o of offers) row[o.company] = scoreMap.get(`${o.id}|${c.id}`) ?? 0;
    return row;
  });

  if (offers.length === 0) {
    return (
      <Card>
        <Empty>
          No offers yet. Add one and the comparison builds itself as you score it.
        </Empty>
      </Card>
    );
  }

  const leaderName = offers.find((o) => o.id === sens.leader)?.company ?? "—";
  const swingToName = offers.find((o) => o.id === sens.swingTo)?.company ?? null;

  return (
    <div className="space-y-8">
      {/* Countdown per offer. Amber inside 7 days — never red. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {offers.map((o) => {
          const d = o.respondBy ? daysUntil(o.respondBy, todayISO) : null;
          const urgent = d !== null && d <= 7;
          return (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-subheading">{o.company}</p>
                  <p className="text-eyebrow text-ink-soft">{o.role}</p>
                </div>
                {d !== null ? (
                  <div className="text-right">
                    <p className="eyebrow">Respond in</p>
                    <p
                      className="font-mono text-heading leading-none"
                      style={{ color: urgent ? "var(--amber)" : "var(--ink)" }}
                    >
                      {d}d
                    </p>
                  </div>
                ) : null}
              </div>
              <dl className="mt-5 space-y-1.5 text-caption">
                {[
                  ["Comp", o.baseComp],
                  ["Other", o.otherComp],
                  ["Location", o.location],
                  ["Dates", [o.startDate, o.endDate].filter(Boolean).join(" – ") || null],
                ].map(([k, v]) =>
                  v ? (
                    <div key={k as string} className="flex justify-between gap-4">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </Card>
          );
        })}
      </div>

      {/* Scoring grid */}
      <Card>
        <Eyebrow className="mb-5">Score each offer, 1–10</Eyebrow>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-caption">
            <thead>
              <tr>
                <th className="pb-3 text-left font-medium">Criterion</th>
                <th className="pb-3 text-center font-medium">Weight</th>
                {offers.map((o) => (
                  <th key={o.id} className="pb-3 text-center font-medium">
                    {o.company}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveCriteria.map((c) => (
                <tr key={c.id} className="border-t border-haze">
                  <td className="py-2.5 pr-4">{c.label}</td>
                  <td className="py-2.5 text-center">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={weights[c.id]}
                      aria-label={`Weight for ${c.label}`}
                      onChange={(e) => {
                        const w = Number(e.target.value);
                        setWeights((p) => ({ ...p, [c.id]: w }));
                        startTransition(async () => {
                          await setCriterionWeight(c.id, w);
                        });
                      }}
                      className="w-12 rounded-control border border-haze bg-transparent px-1 py-1 text-center font-mono text-eyebrow"
                    />
                  </td>
                  {offers.map((o) => {
                    const key = `${o.id}|${c.id}`;
                    return (
                      <td key={o.id} className="py-2.5 text-center">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={scores[key] ?? ""}
                          aria-label={`${o.company} score for ${c.label}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setScores((p) => ({ ...p, [key]: v }));
                            startTransition(async () => {
                              await setOfferScore(o.id, c.id, v);
                            });
                          }}
                          className="w-14 rounded-control border border-haze bg-transparent px-1 py-1 text-center font-mono text-eyebrow"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-haze">
                <td className="py-3 font-medium">Weighted</td>
                <td />
                {offers.map((o) => {
                  const t = totals.find((x) => x.offer.id === o.id);
                  return (
                    <td key={o.id} className="py-3 text-center font-mono text-subheading">
                      {t?.covered === 0 ? "—" : t?.total.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Radar */}
      <Card>
        <Eyebrow className="mb-4">Shape of each offer</Eyebrow>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--haze)" />
              <PolarAngleAxis
                dataKey="criterion"
                tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              {offers.map((o, i) => (
                <Radar
                  key={o.id}
                  name={o.company}
                  dataKey={o.company}
                  stroke={`var(--${SERIES_TOKENS[i % SERIES_TOKENS.length]})`}
                  fill={`var(--${SERIES_TOKENS[i % SERIES_TOKENS.length]})`}
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {offers.map((o, i) => (
            <span key={o.id} className="flex items-center gap-2 text-eyebrow text-ink-soft">
              <span
                className="size-2.5 rounded-full"
                style={{ background: `var(--${SERIES_TOKENS[i % SERIES_TOKENS.length]})` }}
              />
              {o.company}
            </span>
          ))}
        </div>
      </Card>

      {/* Plain-language readout. Never a "recommended" badge. */}
      <Card>
        <Eyebrow className="mb-3">What the numbers say</Eyebrow>
        {ranked.length >= 2 && ranked[0].covered > 0 ? (
          <p className="text-body">
            Weighted, <strong>{leaderName}</strong> leads by{" "}
            <span className="font-mono">{sens.margin.toFixed(2)}</span>.{" "}
            {sens.swingCriterion && swingToName ? (
              <>
                If you dropped <strong>{sens.swingCriterion}</strong> to weight 1,{" "}
                <strong>{swingToName}</strong> would win instead — so that criterion is
                what&rsquo;s actually deciding this.
              </>
            ) : (
              <>
                No single criterion flips the result on its own, so the lead is broad
                rather than resting on one thing.
              </>
            )}
          </p>
        ) : (
          <Empty>Score at least two offers and the comparison appears here.</Empty>
        )}
        <p className="mt-5 font-reflective text-caption italic text-ink-soft">
          This is a way to think, not the answer.
        </p>
      </Card>

      {/* Gut check — deliberately outside the model. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {offers.map((o) => (
          <Card key={o.id}>
            <Eyebrow className="mb-3">Gut check · {o.company}</Eyebrow>
            <textarea
              defaultValue={o.gutCheck ?? ""}
              rows={3}
              placeholder="What does the spreadsheet not capture?"
              onBlur={(e) =>
                startTransition(async () => {
                  await setGutCheck(o.id, e.target.value);
                })
              }
              className="w-full resize-none border-0 bg-transparent p-0 text-body outline-none placeholder:text-ink-soft"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
