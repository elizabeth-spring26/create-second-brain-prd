"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { assignments } from "@/db/schema";

/** Her overlay fields — the ones Canvas sync must never touch. */
const OverlaySchema = z.object({
  id: z.string(),
  myStatus: z.enum(["not_started", "in_progress", "done"]).optional(),
  myPriority: z.enum(["low", "normal", "high"]).optional(),
  estMinutes: z.number().int().min(0).max(6000).nullable().optional(),
});

export async function updateAssignmentOverlay(input: z.infer<typeof OverlaySchema>) {
  const parsed = OverlaySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid update" };

  const { id, ...patch } = parsed.data;
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length === 0) return { ok: true as const };

  await db
    .update(assignments)
    .set({ ...clean, updatedAt: new Date() })
    .where(eq(assignments.id, id));

  revalidatePath("/school");
  return { ok: true as const };
}

const ManualSchema = z.object({
  title: z.string().min(1).max(300),
  dueAt: z.string().nullish(),
  estMinutes: z.number().int().min(0).max(6000).nullish(),
});

/** For anything Canvas doesn't have. */
export async function createManualAssignment(input: z.infer<typeof ManualSchema>) {
  const parsed = ManualSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid assignment" };

  await db.insert(assignments).values({
    title: parsed.data.title,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    estMinutes: parsed.data.estMinutes ?? null,
    isManual: true,
  });

  revalidatePath("/school");
  return { ok: true as const };
}
