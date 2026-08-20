"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { habits } from "@/db/schema";

const HabitSchema = z.object({
  name: z.string().min(1).max(120),
  emoji: z.string().max(8).nullish(),
  direction: z.enum(["build", "break"]).default("build"),
});

export async function createHabit(input: z.infer<typeof HabitSchema>) {
  const parsed = HabitSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Give the habit a name." };

  const existing = await db.select().from(habits);
  await db.insert(habits).values({
    ...parsed.data,
    emoji: parsed.data.emoji || null,
    colorToken: parsed.data.direction === "break" ? "sakura" : "matcha",
    sortOrder: existing.length,
  });
  revalidatePath("/habits");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateHabit(
  id: string,
  patch: { name?: string; emoji?: string | null; direction?: "build" | "break" },
) {
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.slice(0, 120);
  if (patch.emoji !== undefined) clean.emoji = patch.emoji || null;
  if (patch.direction !== undefined) {
    clean.direction = patch.direction;
    clean.colorToken = patch.direction === "break" ? "sakura" : "matcha";
  }
  if (Object.keys(clean).length === 0) return { ok: true as const };

  await db
    .update(habits)
    .set({ ...clean, updatedAt: new Date() })
    .where(eq(habits.id, id));
  revalidatePath("/habits");
  revalidatePath("/");
  return { ok: true as const };
}

/** Archive rather than delete — the logs stay, so history isn't rewritten. */
export async function archiveHabit(id: string) {
  await db
    .update(habits)
    .set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(habits.id, id));
  revalidatePath("/habits");
  revalidatePath("/");
  return { ok: true as const };
}

export async function restoreHabit(id: string) {
  await db
    .update(habits)
    .set({ isActive: true, archivedAt: null, updatedAt: new Date() })
    .where(eq(habits.id, id));
  revalidatePath("/habits");
  revalidatePath("/");
  return { ok: true as const };
}
