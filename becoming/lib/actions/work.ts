"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { workSessions } from "@/db/schema";
import { todayISO } from "@/lib/dates";

const SessionSchema = z.object({
  engagementId: z.string().min(1),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayISO()),
  minutes: z.number().int().min(1).max(24 * 60),
  category: z.string().max(80).nullish(),
  description: z.string().max(1000).nullish(),
  isBillable: z.boolean().default(false),
});

export async function logSession(input: z.infer<typeof SessionSchema>) {
  const parsed = SessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid session" };
  }
  await db.insert(workSessions).values(parsed.data);
  revalidatePath("/work");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteSession(id: string) {
  await db.delete(workSessions).where(eq(workSessions.id, id));
  revalidatePath("/work");
  return { ok: true as const };
}
