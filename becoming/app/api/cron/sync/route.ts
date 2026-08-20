import { NextResponse } from "next/server";
import { syncCanvas } from "@/lib/canvas/sync";
import { assertCron } from "@/lib/cron";
import { syncGoogleCalendar } from "@/lib/google/sync";
import { syncGranola } from "@/lib/granola/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * All three syncs behind one schedule.
 *
 * Vercel's Hobby plan allows daily crons only, so three separate schedules
 * aren't possible — rather than dropping an integration, they run together
 * once a day. The per-provider routes still exist for manual triggering.
 *
 * Each sync is awaited independently: one failing provider must not stop the
 * other two, so failures are collected rather than thrown.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const [canvas, granola, calendar] = await Promise.all([
    syncCanvas().catch((e) => ({ ok: false as const, error: String(e) })),
    syncGranola().catch((e) => ({ ok: false as const, error: String(e) })),
    syncGoogleCalendar().catch((e) => ({ ok: false as const, error: String(e) })),
  ]);

  const allOk = canvas.ok && granola.ok && calendar.ok;
  return NextResponse.json(
    { ok: allOk, canvas, granola, calendar },
    // 200 even on partial failure — the details are in the body, and a 500
    // here would just make Vercel retry syncs that already partly succeeded.
    { status: 200 },
  );
}
