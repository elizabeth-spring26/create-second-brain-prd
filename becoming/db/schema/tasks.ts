import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const TASK_SOURCES = ["manual", "canvas", "granola"] as const;

/**
 * One unified list for the week, whatever the task came from. Canvas
 * assignments and Granola follow-ups are mirrored in here rather than being
 * shown in separate silos — the week is the week.
 *
 * `sourceKey` is the natural key from the origin system, so re-importing
 * updates the existing row instead of duplicating it.
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    source: text("source", { enum: TASK_SOURCES }).notNull().default("manual"),
    sourceKey: text("source_key"),
    /** YYYY-MM-DD in Eastern. Null means "this week, no specific day". */
    dueDate: text("due_date"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    doneAt: integer("done_at", { mode: "timestamp" }),
    notes: text("notes"),
    /** Where it came from, so she can open the meeting or assignment. */
    url: text("url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tasks_source_key_idx").on(t.source, t.sourceKey)],
);
