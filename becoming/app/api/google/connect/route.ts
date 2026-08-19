import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google/client";

export const dynamic = "force-dynamic";

function redirectUri(req: Request) {
  return new URL("/api/google/callback", new URL(req.url).origin).toString();
}

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first." },
      { status: 400 },
    );
  }
  return NextResponse.redirect(authUrl(redirectUri(req)));
}
