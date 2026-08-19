import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { jobApplications, offerCriteria, offerScores, offers } from "@/db/schema";

export async function getApplications() {
  return db.select().from(jobApplications).orderBy(desc(jobApplications.updatedAt));
}

export async function getOffersWithScores() {
  const [offerRows, criteria, scores] = await Promise.all([
    db.select().from(offers).orderBy(offers.createdAt),
    db.select().from(offerCriteria).orderBy(offerCriteria.sortOrder),
    db.select().from(offerScores),
  ]);

  const scoreMap = new Map<string, number>();
  for (const s of scores) scoreMap.set(`${s.offerId}|${s.criterionId}`, s.score);

  return { offers: offerRows, criteria, scoreMap };
}
