import { NextResponse, type NextRequest } from "next/server";

/**
 * A single shared password in front of the whole app.
 *
 * Vercel's own Deployment Protection (SSO or password) is Pro-only for
 * production deployments, and this project is on Hobby — so production would
 * otherwise be readable by anyone with the URL. This is the same idea Vercel
 * would have provided, implemented in ~30 lines. It is NOT an account system:
 * there are no users, no sessions, no database involvement.
 *
 * Remove this file if the project moves to Pro and Vercel's protection is
 * turned on instead.
 */

const PUBLIC_PATHS = [
  "/api/cron", // guarded by CRON_SECRET, and Vercel's cron sends no basic auth
  "/api/google/callback", // Google redirects here; it validates its own code
];

/** Length-independent comparison so the password can't be probed by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const expected = process.env.APP_PASSWORD;

  // No password configured (local dev) — don't lock her out of her own laptop.
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(password, expected)) return NextResponse.next();
    } catch {
      // fall through to the challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BECOMING", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except Next's own static output and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
