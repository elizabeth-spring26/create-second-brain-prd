import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?google=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/settings?google=missing_code", url.origin));
  }

  try {
    await exchangeCode(code, new URL("/api/google/callback", url.origin).toString());
    return NextResponse.redirect(new URL("/settings?google=connected", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/settings?google=${encodeURIComponent(message)}`, url.origin),
    );
  }
}
