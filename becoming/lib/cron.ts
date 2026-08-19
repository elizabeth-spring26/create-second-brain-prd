import "server-only";
import { NextResponse } from "next/server";

/**
 * Every cron route verifies this before doing anything. Without app-level
 * login, an unguarded cron endpoint is a public "sync now" button.
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
