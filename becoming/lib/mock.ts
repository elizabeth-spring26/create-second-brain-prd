import type { RibbonPoint } from "@/components/energy-ribbon";

/**
 * Phase 0 stand-in. Deterministic so the ribbon looks identical on server and
 * client render — a random walk here would cause a hydration mismatch.
 * Replaced by real daily_checkins data in Phase 2.
 */
export function mockRibbonPoints(days = 30): RibbonPoint[] {
  const out: RibbonPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Two out-of-phase sines: a weekly rhythm plus a slower drift.
    const t = days - 1 - i;
    const energy = 6 + 2 * Math.sin(t / 3.1) + 1.1 * Math.sin(t / 8.7);
    const sleep = 7 + 1.4 * Math.sin(t / 4.3 + 1.2);

    out.push({
      date: d.toISOString().slice(0, 10),
      energy: Math.round(Math.max(1, Math.min(10, energy)) * 10) / 10,
      sleep: Math.round(Math.max(4, Math.min(10, sleep)) * 10) / 10,
    });
  }
  return out;
}
