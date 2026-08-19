import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { recordSync, getSyncState } from "@/lib/canvas/sync";
import {
  SyncTokenExpired,
  googleConfigured,
  listEvents,
  type GoogleEventT,
} from "./client";

/** Tag written on every event this app creates. */
export const BECOMING_ID = "becomingId";
export const BECOMING_CATEGORY = "becomingCategory";

const CATEGORIES = [
  "networking",
  "friends_family",
  "self_care",
  "gym",
  "work",
  "school",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];

function readCategory(e: GoogleEventT): Category {
  const raw = e.extendedProperties?.private?.[BECOMING_CATEGORY];
  return (CATEGORIES as readonly string[]).includes(raw ?? "")
    ? (raw as Category)
    : "other";
}

function calendarId() {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

/**
 * Pull events from Google into the local mirror.
 *
 * The loop guard: an event we created carries `becomingId` in its private
 * extended properties. We still store it — it IS the same event — but we match
 * on google_event_id (unique index) so it updates the existing row instead of
 * being re-imported as a fresh duplicate. That re-import loop is the classic
 * bug in two-way calendar sync.
 */
async function pullOnce(syncToken: string | null) {
  const { items, nextSyncToken } = await listEvents(calendarId(), syncToken);
  let upserted = 0;
  let deleted = 0;

  for (const e of items) {
    if (e.status === "cancelled") {
      await db.delete(calendarEvents).where(eq(calendarEvents.googleEventId, e.id));
      deleted++;
      continue;
    }

    const isAllDay = Boolean(e.start?.date);
    const values = {
      googleCalendarId: calendarId(),
      title: e.summary ?? "(no title)",
      category: readCategory(e),
      startsAt: e.start?.dateTime ? new Date(e.start.dateTime) : null,
      endsAt: e.end?.dateTime ? new Date(e.end.dateTime) : null,
      isAllDay,
      allDayDate: e.start?.date ?? null,
      location: e.location ?? null,
      notes: e.description ?? null,
      // Events we wrote keep origin "becoming" so the UI can tell them apart.
      origin: e.extendedProperties?.private?.[BECOMING_ID] ? ("becoming" as const) : ("google" as const),
      etag: e.etag ?? null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    const found = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(eq(calendarEvents.googleEventId, e.id))
      .limit(1);

    if (found.length > 0) {
      await db.update(calendarEvents).set(values).where(eq(calendarEvents.id, found[0].id));
    } else {
      await db.insert(calendarEvents).values({ googleEventId: e.id, ...values });
    }
    upserted++;
  }

  return { upserted, deleted, nextSyncToken };
}

export async function syncGoogleCalendar() {
  if (!googleConfigured()) {
    return { ok: false as const, error: "Google Calendar isn't connected yet." };
  }

  try {
    const state = await getSyncState("google_calendar");
    let result;
    try {
      result = await pullOnce(state?.syncToken ?? null);
    } catch (err) {
      if (err instanceof SyncTokenExpired) {
        // Clear the dead token and do a clean full resync rather than failing.
        result = await pullOnce(null);
      } else {
        throw err;
      }
    }

    await recordSync("google_calendar", null, result.nextSyncToken ?? null);
    return { ok: true as const, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordSync("google_calendar", message);
    return { ok: false as const, error: message };
  }
}
