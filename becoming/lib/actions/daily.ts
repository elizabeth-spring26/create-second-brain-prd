"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { dailyCheckins, habitLogs } from "@/db/schema";
import { todayISO } from "@/lib/dates";

const CheckinSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bedTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  sleepHours: z.number().min(0).max(24).nullish(),
  sleepQuality: z.number().int().min(1).max(5).nullish(),
  energyMorning: z.number().int().min(1).max(10).nullish(),
  energyEvening: z.number().int().min(1).max(10).nullish(),
  moodWord: z.string().max(40).nullish(),
  gratitude: z.string().max(2000).nullish(),
  drain: z.string().max(2000).nullish(),
  notes: z.string().max(4000).nullish(),
});

export type CheckinInput = z.infer<typeof CheckinSchema>;

/**
 * Upsert one day's check-in. Only the fields present in the payload are
 * written, so the evening pass never wipes what the morning pass recorded.
 */
export async function saveCheckin(input: CheckinInput) {
  const parsed = CheckinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid check-in" };
  }
  const { logDate, ...rest } = parsed.data;

  // Drop undefined so a partial save doesn't null out existing columns.
  const patch = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );

  const existing = await db
    .select({ id: dailyCheckins.id })
    .from(dailyCheckins)
    .where(eq(dailyCheckins.logDate, logDate))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyCheckins)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(dailyCheckins.id, existing[0].id));
  } else {
    await db.insert(dailyCheckins).values({ logDate, ...patch });
  }

  revalidatePath("/");
  revalidatePath("/insights");
  return { ok: true as const };
}

/**
 * Toggle a habit for a day. For build habits a row means "did it"; for break
 * habits a row means "it happened" — either way the row is the record, and
 * removing it is how you undo a mis-tap.
 */
export async function toggleHabit(habitId: string, logDate: string = todayISO(), value = 1) {
  const existing = await db
    .select({ id: habitLogs.id })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, logDate)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
  } else {
    await db.insert(habitLogs).values({ habitId, logDate, value });
  }

  revalidatePath("/");
  revalidatePath("/habits");
  return { ok: true as const, logged: existing.length === 0 };
}

export async function setHabitValue(habitId: string, logDate: string, value: number, note?: string) {
  const existing = await db
    .select({ id: habitLogs.id })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, logDate)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(habitLogs)
      .set({ value, note, updatedAt: new Date() })
      .where(eq(habitLogs.id, existing[0].id));
  } else {
    await db.insert(habitLogs).values({ habitId, logDate, value, note });
  }

  revalidatePath("/");
  revalidatePath("/habits");
  return { ok: true as const };
}
