import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const courses = sqliteTable(
  "courses",
  {
    id: id(),
    canvasCourseId: integer("canvas_course_id"),
    name: text("name").notNull(),
    code: text("code"),
    term: text("term"),
    colorToken: text("color_token").notNull().default("iris"),
    isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("courses_canvas_id_idx").on(t.canvasCourseId)],
);

export const assignments = sqliteTable(
  "assignments",
  {
    id: id(),
    canvasAssignmentId: integer("canvas_assignment_id"),
    courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueAt: integer("due_at", { mode: "timestamp" }),
    pointsPossible: real("points_possible"),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    gradedScore: real("graded_score"),
    htmlUrl: text("html_url"),

    /* ── Her overlay. Canvas sync must NEVER overwrite these three. ────────── */
    myStatus: text("my_status", { enum: ["not_started", "in_progress", "done"] })
      .notNull()
      .default("not_started"),
    myPriority: text("my_priority", { enum: ["low", "normal", "high"] })
      .notNull()
      .default("normal"),
    estMinutes: integer("est_minutes"),

    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("assignments_canvas_id_idx").on(t.canvasAssignmentId)],
);
