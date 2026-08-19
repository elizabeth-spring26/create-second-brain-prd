import { NextResponse } from "next/server";
import { syncCanvas } from "@/lib/canvas/sync";
import { assertCron } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const result = await syncCanvas();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
