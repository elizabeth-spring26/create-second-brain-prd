"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { monthlyGoals, weeklyReviews } from "@/db/schema";
import { monthStartISO } from "@/lib/dates";
import { getWeekStats } from "@/lib/queries/reflect";

const ReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  whatWentWrong: z.string().max(4000).nullish(),
  whatDrainedMe: z.string().max(4000).nullish(),
  whatILearned: z.string().max(4000).nullish(),
  wins: z.array(z.string().max(500)).max(10).default([]),
  oneChangeNextWeek: z.string().max(1000).nullish(),
  weekRating: z.number().int().min(1).max(5).nullish(),
  /** Set when she answers the callback about last week's one change. */
  didLastChange: z.boolean().nullish(),
});

export async function saveWeeklyReview(input: z.infer<typeof ReviewSchema>) {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid review" };
  }
  const { weekStart, didLastChange, ...rest } = parsed.data;

  // Snapshot the stats so the review always reflects what she was looking at.
  const stats = await getWeekStats(weekStart);

  const values = {
    ...rest,
    wins: rest.wins.filter((w) => w.trim().length > 0),
    computedSleepAvg: stats.sleepAvg,
    computedEnergyAvg: stats.energyAvg,
    computedHabitPct: stats.habitPct,
    completedAt: new Date(),
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: weeklyReviews.id })
    .from(weeklyReviews)
    .where(eq(weeklyReviews.weekStart, weekStart))
    .limit(1);

  if (existing.length > 0) {
    await db.update(weeklyReviews).set(values).where(eq(weeklyReviews.id, existing[0].id));
  } else {
    await db.insert(weeklyReviews).values({ weekStart, ...values });
  }

  void didLastChange; // recorded in the UI's copy; no column needed yet

  revalidatePath("/reflect");
  return { ok: true as const };
}

const GoalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  title: z.string().min(1).max(200),
  category: z.string().max(60).nullish(),
  whyItMatters: z.string().max(2000).nullish(),
  metricLabel: z.string().max(100).nullish(),
  targetValue: z.number().nullish(),
});

export async function createMonthlyGoal(input: z.infer<typeof GoalSchema>) {
  const parsed = GoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid goal" };
  }
  await db.insert(monthlyGoals).values(parsed.data);
  revalidatePath("/reflect");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Quick-add from the sidebar. Deliberately writes to the same monthly_goals
 * table that /reflect uses, so the sidebar checklist and the full goal cards
 * are one set of goals rather than two competing lists.
 */
export async function addMonthlyGoalQuick(title: string) {
  const clean = title.trim();
  if (!clean) return { ok: false as const, error: "Give the goal a name." };

  await db.insert(monthlyGoals).values({ month: monthStartISO(), title: clean.slice(0, 200) });
  revalidatePath("/reflect");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Sidebar checkbox: hit ⇄ active. */
export async function toggleMonthlyGoal(id: string) {
  const rows = await db.select().from(monthlyGoals).where(eq(monthlyGoals.id, id)).limit(1);
  const g = rows[0];
  if (!g) return { ok: false as const, error: "Goal not found." };

  await db
    .update(monthlyGoals)
    .set({ status: g.status === "hit" ? "active" : "hit", updatedAt: new Date() })
    .where(eq(monthlyGoals.id, id));
  revalidatePath("/reflect");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setGoalStatus(
  id: string,
  status: "active" | "hit" | "missed" | "carried",
) {
  await db
    .update(monthlyGoals)
    .set({ status, updatedAt: new Date() })
    .where(eq(monthlyGoals.id, id));
  revalidatePath("/reflect");
  return { ok: true as const };
}

/** Carry an unfinished goal into the given month with one click. */
export async function carryGoalForward(id: string, toMonth: string) {
  const rows = await db.select().from(monthlyGoals).where(eq(monthlyGoals.id, id)).limit(1);
  const g = rows[0];
  if (!g) return { ok: false as const, error: "Goal not found" };

  await db.insert(monthlyGoals).values({
    month: toMonth,
    title: g.title,
    category: g.category,
    whyItMatters: g.whyItMatters,
    metricLabel: g.metricLabel,
    targetValue: g.targetValue,
  });
  await db
    .update(monthlyGoals)
    .set({ status: "carried", updatedAt: new Date() })
    .where(eq(monthlyGoals.id, id));

  revalidatePath("/reflect");
  return { ok: true as const };
}
