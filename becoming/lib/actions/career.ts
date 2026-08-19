"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { jobApplications, offerCriteria, offerScores, offers } from "@/db/schema";

const STATUSES = [
  "saved",
  "applied",
  "phone_screen",
  "interviewing",
  "final",
  "offer",
  "rejected",
  "withdrawn",
  "accepted",
] as const;

const AppSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  source: z.string().max(120).nullish(),
  location: z.string().max(120).nullish(),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  status: z.enum(STATUSES).default("saved"),
  nextStep: z.string().max(300).nullish(),
  nextStepDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  postingUrl: z.string().max(600).nullish(),
  compNote: z.string().max(300).nullish(),
  excitement: z.number().int().min(1).max(5).nullish(),
  notes: z.string().max(4000).nullish(),
});

export async function createApplication(input: z.infer<typeof AppSchema>) {
  const parsed = AppSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid application" };
  }
  await db.insert(jobApplications).values(parsed.data);
  revalidatePath("/career");
  return { ok: true as const };
}

export async function updateApplication(
  id: string,
  patch: Partial<z.infer<typeof AppSchema>>,
) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length === 0) return { ok: true as const };
  await db
    .update(jobApplications)
    .set({ ...clean, updatedAt: new Date() })
    .where(eq(jobApplications.id, id));
  revalidatePath("/career");
  return { ok: true as const };
}

const OfferSchema = z.object({
  jobApplicationId: z.string().nullish(),
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  baseComp: z.string().max(120).nullish(),
  otherComp: z.string().max(240).nullish(),
  location: z.string().max(120).nullish(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  respondBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export async function createOffer(input: z.infer<typeof OfferSchema>) {
  const parsed = OfferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid offer" };
  }
  await db.insert(offers).values(parsed.data);
  revalidatePath("/career");
  return { ok: true as const };
}

export async function setOfferScore(offerId: string, criterionId: string, score: number) {
  const s = Math.max(1, Math.min(10, Math.round(score)));
  const existing = await db
    .select({ id: offerScores.id })
    .from(offerScores)
    .where(and(eq(offerScores.offerId, offerId), eq(offerScores.criterionId, criterionId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(offerScores)
      .set({ score: s, updatedAt: new Date() })
      .where(eq(offerScores.id, existing[0].id));
  } else {
    await db.insert(offerScores).values({ offerId, criterionId, score: s });
  }
  revalidatePath("/career");
  return { ok: true as const };
}

export async function setCriterionWeight(id: string, weight: number) {
  await db
    .update(offerCriteria)
    .set({ weight: Math.max(1, Math.min(5, Math.round(weight))), updatedAt: new Date() })
    .where(eq(offerCriteria.id, id));
  revalidatePath("/career");
  return { ok: true as const };
}

export async function setGutCheck(offerId: string, text: string) {
  await db
    .update(offers)
    .set({ gutCheck: text.slice(0, 4000), updatedAt: new Date() })
    .where(eq(offers.id, offerId));
  revalidatePath("/career");
  return { ok: true as const };
}
