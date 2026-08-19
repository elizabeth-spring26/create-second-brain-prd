import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";
import { engagements } from "./work";

export const EVENT_CATEGORIES = [
  "networking",
  "friends_family",
  "self_care",
  "gym",
  "work",
  "school",
  "other",
] as const;

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: id(),
    googleEventId: text("google_event_id"),
    googleCalendarId: text("google_calendar_id"),
    title: text("title").notNull(),
    category: text("category", { enum: EVENT_CATEGORIES }).notNull().default("other"),
    startsAt: integer("starts_at", { mode: "timestamp" }),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    /** All-day events are stored as YYYY-MM-DD, not timestamps — see allDayDate. */
    isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
    allDayDate: text("all_day_date"),
    location: text("location"),
    notes: text("notes"),
    /** 1-5 */
    energyCost: integer("energy_cost"),
    origin: text("origin", { enum: ["google", "becoming"] })
      .notNull()
      .default("google"),
    /** Google's etag, sent back as If-Match so we never clobber an edit made there. */
    etag: text("etag"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("calendar_events_google_id_idx").on(t.googleEventId)],
);

/**
 * Granola meetings. Read-only mirror — the app never writes back to Granola.
 * `googleEventId` comes from the API's `calendar_event`, which is what lets a
 * meeting and its calendar block find each other.
 */
export const meetings = sqliteTable(
  "meetings",
  {
    id: id(),
    granolaNoteId: text("granola_note_id").notNull(),
    title: text("title").notNull(),
    summaryMarkdown: text("summary_markdown"),
    webUrl: text("web_url"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    attendees: text("attendees", { mode: "json" })
      .$type<{ name?: string; email?: string }[]>()
      .notNull()
      .default(sql`'[]'`),
    folderId: text("folder_id"),
    folderName: text("folder_name"),
    googleEventId: text("google_event_id"),
    category: text("category"),
    engagementId: text("engagement_id").references(() => engagements.id, {
      onDelete: "set null",
    }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("meetings_granola_id_idx").on(t.granolaNoteId)],
);
