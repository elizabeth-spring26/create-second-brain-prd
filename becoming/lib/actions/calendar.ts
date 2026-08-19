"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { insertEvent, timedBody } from "@/lib/google/client";
import { BECOMING_CATEGORY, BECOMING_ID, syncGoogleCalendar } from "@/lib/google/sync";
import { easternToInstant } from "@/lib/dates";

const EventSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.enum([
    "networking",
    "friends_family",
    "self_care",
    "gym",
    "work",
    "school",
    "other",
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().max(300).nullish(),
});

/**
 * Create locally, then push to Google. The event is tagged with becomingId so
 * the next pull recognises it as ours and updates rather than duplicating.
 */
export async function createEvent(input: z.infer<typeof EventSchema>) {
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid event" };
  }
  const { title, category, date, startTime, endTime, location } = parsed.data;

  const startsAt = easternToInstant(date, startTime);
  const endsAt = easternToInstant(date, endTime);
  if (endsAt <= startsAt) {
    return { ok: false as const, error: "The end time needs to be after the start time." };
  }

  const localId = crypto.randomUUID();
  await db.insert(calendarEvents).values({
    id: localId,
    title,
    category,
    startsAt,
    endsAt,
    isAllDay: false,
    location: location ?? null,
    origin: "becoming",
  });

  try {
    const created = await insertEvent(process.env.GOOGLE_CALENDAR_ID || "primary", {
      summary: title,
      location: location ?? undefined,
      ...timedBody(startsAt.toISOString(), endsAt.toISOString()),
      extendedProperties: {
        private: { [BECOMING_ID]: localId, [BECOMING_CATEGORY]: category },
      },
    });
    await db
      .update(calendarEvents)
      .set({ googleEventId: created.id, etag: created.etag ?? null, lastSyncedAt: new Date() })
      .where(eq(calendarEvents.id, localId));
  } catch (err) {
    // The local event still exists — say plainly that Google didn't take it.
    const message = err instanceof Error ? err.message : String(err);
    revalidatePath("/calendar");
    return { ok: true as const, warning: `Saved here, but Google didn't accept it: ${message}` };
  }

  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function runCalendarSync() {
  const res = await syncGoogleCalendar();
  revalidatePath("/calendar");
  return res;
}
