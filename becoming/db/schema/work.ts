import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const engagements = sqliteTable("engagements", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["internship", "client", "generator", "personal"] })
    .notNull()
    .default("client"),
  hoursTargetWeekly: real("hours_target_weekly"),
  hourlyRate: real("hourly_rate"),
  colorToken: text("color_token").notNull().default("iris"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workSessions = sqliteTable("work_sessions", {
  id: id(),
  engagementId: text("engagement_id")
    .notNull()
    .references(() => engagements.id, { onDelete: "cascade" }),
  /** YYYY-MM-DD */
  sessionDate: text("session_date").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  minutes: integer("minutes").notNull().default(0),
  category: text("category"),
  description: text("description"),
  isBillable: integer("is_billable", { mode: "boolean" }).notNull().default(false),
  invoicedAt: integer("invoiced_at", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
