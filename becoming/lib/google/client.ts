import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { syncState } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { TIMEZONE } from "@/lib/config";

/**
 * Google Calendar is an API credential here, not a login. There is no sign-in
 * flow for the app itself — this only grants access to her calendar.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The refresh token is stored (encrypted) on the google_calendar sync_state
 * row, so no extra table is needed for a single-user app.
 */
async function stateRow() {
  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.provider, "google_calendar"))
    .limit(1);
  return rows[0] ?? null;
}

export async function isConnected() {
  const row = await stateRow();
  return Boolean(row?.lastError === null && row?.syncToken !== undefined && row?.refreshToken);
}

export async function saveRefreshToken(token: string) {
  const enc = encrypt(token);
  const row = await stateRow();
  if (row) {
    await db
      .update(syncState)
      .set({ refreshToken: enc, updatedAt: new Date() })
      .where(eq(syncState.id, row.id));
  } else {
    await db.insert(syncState).values({ provider: "google_calendar", refreshToken: enc });
  }
}

export async function getRefreshToken(): Promise<string | null> {
  const row = await stateRow();
  if (!row?.refreshToken) return null;
  try {
    return decrypt(row.refreshToken);
  } catch {
    return null;
  }
}

const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().nullish(),
});

let cachedAccess: { token: string; expiresAt: number } | null = null;

/** Refreshes proactively when under 5 minutes of life remains. */
export async function getAccessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cachedAccess.token;
  }
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error("Google Calendar isn't connected yet.");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);

  const parsed = TokenResponse.parse(await res.json());
  cachedAccess = {
    token: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  };
  return parsed.access_token;
}

/** Exchange the one-time code for a refresh token. */
export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google code exchange failed: ${res.status}`);
  const parsed = TokenResponse.parse(await res.json());
  if (!parsed.refresh_token) {
    // Only issued on first consent — hence access_type=offline & prompt=consent.
    throw new Error(
      "Google returned no refresh token. Revoke access at myaccount.google.com and reconnect.",
    );
  }
  await saveRefreshToken(parsed.refresh_token);
  return parsed;
}

export function authUrl(redirectUri: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/* ── Calendar API ─────────────────────────────────────────────────────────── */

export const GoogleEvent = z.object({
  id: z.string(),
  etag: z.string().nullish(),
  status: z.string().nullish(),
  summary: z.string().nullish(),
  location: z.string().nullish(),
  description: z.string().nullish(),
  start: z.object({ dateTime: z.string().nullish(), date: z.string().nullish() }).nullish(),
  end: z.object({ dateTime: z.string().nullish(), date: z.string().nullish() }).nullish(),
  extendedProperties: z
    .object({ private: z.record(z.string(), z.string()).nullish() })
    .nullish(),
});

export type GoogleEventT = z.infer<typeof GoogleEvent>;

const ListResponse = z.object({
  items: z.array(GoogleEvent).default([]),
  nextPageToken: z.string().nullish(),
  nextSyncToken: z.string().nullish(),
});

export class SyncTokenExpired extends Error {}

export async function listEvents(calendarId: string, syncToken: string | null) {
  const token = await getAccessToken();
  const items: GoogleEventT[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;

  do {
    const p = new URLSearchParams({ maxResults: "250", showDeleted: "true" });
    if (syncToken) p.set("syncToken", syncToken);
    else {
      p.set("singleEvents", "true");
      p.set("timeMin", new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString());
    }
    if (pageToken) p.set("pageToken", pageToken);

    const res: Response = await fetch(
      `${API}/calendars/${encodeURIComponent(calendarId)}/events?${p}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );

    // 410 GONE means the syncToken aged out. This WILL happen; a clean full
    // resync is the only correct response, and silently swallowing it is how
    // calendars quietly stop updating.
    if (res.status === 410) throw new SyncTokenExpired("syncToken expired");
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);

    const parsed = ListResponse.parse(await res.json());
    items.push(...parsed.items);
    pageToken = parsed.nextPageToken ?? null;
    nextSyncToken = parsed.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { items, nextSyncToken };
}

export async function insertEvent(
  calendarId: string,
  body: Record<string, unknown>,
): Promise<GoogleEventT> {
  const token = await getAccessToken();
  const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google insert failed ${res.status}: ${await res.text()}`);
  return GoogleEvent.parse(await res.json());
}

export async function patchEvent(
  calendarId: string,
  eventId: string,
  body: Record<string, unknown>,
  etag: string | null,
): Promise<GoogleEventT> {
  const token = await getAccessToken();
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // If-Match so we never clobber an edit made in Google itself.
        ...(etag ? { "If-Match": etag } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`Google patch failed ${res.status}: ${await res.text()}`);
  return GoogleEvent.parse(await res.json());
}

/** Every write carries an explicit Eastern timezone. */
export function timedBody(startISO: string, endISO: string) {
  return {
    start: { dateTime: startISO, timeZone: TIMEZONE },
    end: { dateTime: endISO, timeZone: TIMEZONE },
  };
}

/** All-day events are dates, never timestamps — this is where off-by-one lives. */
export function allDayBody(startDate: string, endDateExclusive: string) {
  return { start: { date: startDate }, end: { date: endDateExclusive } };
}
