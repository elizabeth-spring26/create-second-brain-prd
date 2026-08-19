import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const jobApplications = sqliteTable("job_applications", {
  id: id(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  source: text("source"),
  location: text("location"),
  workMode: text("work_mode", { enum: ["onsite", "hybrid", "remote"] }),
  /** YYYY-MM-DD */
  appliedOn: text("applied_on"),
  status: text("status", {
    enum: [
      "saved",
      "applied",
      "phone_screen",
      "interviewing",
      "final",
      "offer",
      "rejected",
      "withdrawn",
      "accepted",
    ],
  })
    .notNull()
    .default("saved"),
  nextStep: text("next_step"),
  /** YYYY-MM-DD */
  nextStepDate: text("next_step_date"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  postingUrl: text("posting_url"),
  compNote: text("comp_note"),
  /** 1-5 */
  excitement: integer("excitement"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const offers = sqliteTable("offers", {
  id: id(),
  jobApplicationId: text("job_application_id").references(() => jobApplications.id, {
    onDelete: "set null",
  }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  baseComp: text("base_comp"),
  otherComp: text("other_comp"),
  location: text("location"),
  /** YYYY-MM-DD */
  startDate: text("start_date"),
  endDate: text("end_date"),
  respondBy: text("respond_by"),
  status: text("status", { enum: ["open", "accepted", "declined", "expired"] })
    .notNull()
    .default("open"),
  /** Free-text, deliberately outside the scoring model. */
  gutCheck: text("gut_check"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const offerCriteria = sqliteTable("offer_criteria", {
  id: id(),
  label: text("label").notNull(),
  /** 1-5 */
  weight: integer("weight").notNull().default(3),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const offerScores = sqliteTable(
  "offer_scores",
  {
    id: id(),
    offerId: text("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => offerCriteria.id, { onDelete: "cascade" }),
    /** 1-10 */
    score: integer("score").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("offer_scores_offer_criterion_idx").on(t.offerId, t.criterionId)],
);

/** Seeded on first run. All weight 3, all editable. */
export const DEFAULT_OFFER_CRITERIA = [
  "Learning curve",
  "Mentorship quality",
  "Comp",
  "Location & commute",
  "Brand on résumé",
  "Team I'd work with",
  "Path to return offer",
  "Energy cost",
] as const;
