/**
 * Pure scoring math, deliberately free of any DB import so the offer matrix
 * can run this on the client while the queries stay server-only.
 */

export type Criterion = { id: string; label: string; weight: number };

/** Weighted average on a 0–10 scale, so offers stay comparable. */
export function weightedTotal(
  offerId: string,
  criteria: Criterion[],
  scoreMap: Map<string, number>,
): { total: number; covered: number } {
  let sum = 0;
  let weight = 0;
  let covered = 0;
  for (const c of criteria) {
    const s = scoreMap.get(`${offerId}|${c.id}`);
    if (s === undefined) continue;
    sum += s * c.weight;
    weight += c.weight;
    covered++;
  }
  return { total: weight === 0 ? 0 : Math.round((sum / weight) * 100) / 100, covered };
}

/**
 * A real one-criterion sensitivity check: which single criterion, if its weight
 * dropped to 1, would change who leads? This answers "what is actually deciding
 * this" — it is not a recommendation, and never picks an offer for her.
 */
export function sensitivity(
  offerIds: string[],
  criteria: Criterion[],
  scoreMap: Map<string, number>,
): { leader: string | null; margin: number; swingCriterion: string | null; swingTo: string | null } {
  if (offerIds.length < 2) {
    return { leader: offerIds[0] ?? null, margin: 0, swingCriterion: null, swingTo: null };
  }

  const rank = (crits: Criterion[]) =>
    offerIds
      .map((id) => ({ id, total: weightedTotal(id, crits, scoreMap).total }))
      .sort((a, b) => b.total - a.total);

  const base = rank(criteria);
  const leader = base[0].id;
  const margin = Math.round((base[0].total - base[1].total) * 100) / 100;

  for (const c of criteria) {
    if (c.weight <= 1) continue;
    const altered = criteria.map((x) => (x.id === c.id ? { ...x, weight: 1 } : x));
    const alt = rank(altered);
    if (alt[0].id !== leader) {
      return { leader, margin, swingCriterion: c.label, swingTo: alt[0].id };
    }
  }
  return { leader, margin, swingCriterion: null, swingTo: null };
}

/** applied → screens → interviews → offers, with conversion percentages. */
export function funnel(apps: { status: string }[]) {
  const count = (...ss: string[]) => apps.filter((a) => ss.includes(a.status)).length;

  const applied = count(
    "applied",
    "phone_screen",
    "interviewing",
    "final",
    "offer",
    "rejected",
    "accepted",
  );
  const screens = count("phone_screen", "interviewing", "final", "offer", "accepted");
  const interviews = count("interviewing", "final", "offer", "accepted");
  const offerCount = count("offer", "accepted");

  const pct = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 100));

  return {
    applied,
    screens,
    interviews,
    offers: offerCount,
    screenRate: pct(screens, applied),
    interviewRate: pct(interviews, screens),
    offerRate: pct(offerCount, interviews),
  };
}

/** Anything sitting in `applied` for 14+ days with no next step. */
export function needsAttention(
  apps: {
    id: string;
    company: string;
    role: string;
    status: string;
    appliedOn: string | null;
    nextStep: string | null;
  }[],
  todayISO: string,
) {
  const cutoff = new Date(`${todayISO}T12:00:00`).getTime() - 14 * 24 * 3600 * 1000;
  return apps.filter(
    (a) =>
      a.status === "applied" &&
      !a.nextStep &&
      a.appliedOn &&
      new Date(`${a.appliedOn}T12:00:00`).getTime() < cutoff,
  );
}
