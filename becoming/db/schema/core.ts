import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Shared column helpers. Single-user app — no user_id anywhere. */
export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const updatedAt = () =>
  integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

/**
 * Single-row table. Replaces the brief's `profiles` now that there is no auth.
 */
export const settings = sqliteTable("settings", {
  id: id(),
  displayName: text("display_name").notNull().default("Elizabeth"),
  timezone: text("timezone").notNull().default("America/New_York"),
  /** "HH:MM" local */
  wakeGoal: text("wake_goal"),
  /** "HH:MM" local. "00:00" means midnight. */
  bedGoal: text("bed_goal"),
  sleepGoalHours: real("sleep_goal_hours"),
  energyGoal: integer("energy_goal"),
  /**
   * Canvas is off by default: last semester's assignments are noise until the
   * new schedule starts. Flip this on /settings when term begins.
   */
  showCanvas: integer("show_canvas", { mode: "boolean" }).notNull().default(false),
  onboardedAt: integer("onboarded_at", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const habits = sqliteTable("habits", {
  id: id(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  kind: text("kind", { enum: ["boolean", "numeric", "scale"] })
    .notNull()
    .default("boolean"),
  unit: text("unit"),
  targetValue: real("target_value"),
  /** build = do more of it. break = the thing you're letting go of. */
  direction: text("direction", { enum: ["build", "break"] })
    .notNull()
    .default("build"),
  colorToken: text("color_token").notNull().default("matcha"),
  sortOrder: integer("sort_order").notNull().default(0),
  /**
   * Only pinned habits appear on Today. The full set lives on /habits — the
   * home screen is meant to be glanceable, not a complete inventory.
   */
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: id(),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD in America/New_York */
    logDate: text("log_date").notNull(),
    value: real("value").notNull().default(1),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.logDate)],
);

export const dailyCheckins = sqliteTable(
  "daily_checkins",
  {
    id: id(),
    /** YYYY-MM-DD */
    logDate: text("log_date").notNull(),
    /** "HH:MM" local */
    bedTime: text("bed_time"),
    wakeTime: text("wake_time"),
    sleepHours: real("sleep_hours"),
    /** 1-5 */
    sleepQuality: integer("sleep_quality"),
    /** 1-10 */
    energyMorning: integer("energy_morning"),
    energyEvening: integer("energy_evening"),
    moodWord: text("mood_word"),
    gratitude: text("gratitude"),
    drain: text("drain"),
    /** JSON array of habit ids she slipped on — SQLite has no array type. */
    slippedHabitIds: text("slipped_habit_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("daily_checkins_date_idx").on(t.logDate)],
);
