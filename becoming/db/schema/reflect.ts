import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const weeklyReviews = sqliteTable(
  "weekly_reviews",
  {
    id: id(),
    /** YYYY-MM-DD, the Monday that starts the week */
    weekStart: text("week_start").notNull(),
    whatWentWrong: text("what_went_wrong"),
    whatDrainedMe: text("what_drained_me"),
    whatILearned: text("what_i_learned"),
    /** JSON array of strings */
    wins: text("wins", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    oneChangeNextWeek: text("one_change_next_week"),
    /** 1-5 */
    weekRating: integer("week_rating"),
    /** Snapshotted at submit so the review always reflects what she saw. */
    computedSleepAvg: real("computed_sleep_avg"),
    computedEnergyAvg: real("computed_energy_avg"),
    computedHabitPct: real("computed_habit_pct"),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("weekly_reviews_week_idx").on(t.weekStart)],
);

export const monthlyGoals = sqliteTable("monthly_goals", {
  id: id(),
  /** YYYY-MM-01 */
  month: text("month").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  whyItMatters: text("why_it_matters"),
  metricLabel: text("metric_label"),
  targetValue: real("target_value"),
  /** Recomputed from the source tables — never hand-updated. */
  currentValue: real("current_value").notNull().default(0),
  status: text("status", { enum: ["active", "hit", "missed", "carried"] })
    .notNull()
    .default("active"),
  endOfMonthReflection: text("end_of_month_reflection"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
