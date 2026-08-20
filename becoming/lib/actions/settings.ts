"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses, settings } from "@/db/schema";

export async function setShowCanvas(show: boolean) {
  const rows = await db.select({ id: settings.id }).from(settings).limit(1);
  if (rows.length === 0) {
    await db.insert(settings).values({ showCanvas: show });
  } else {
    await db
      .update(settings)
      .set({ showCanvas: show, updatedAt: new Date() })
      .where(eq(settings.id, rows[0].id));
  }
  revalidatePath("/settings");
  revalidatePath("/school");
  revalidatePath("/");
  return { ok: true as const };
}

/** Hide a course whose assignments are last semester's noise. */
export async function setCourseHidden(id: string, hidden: boolean) {
  await db
    .update(courses)
    .set({ isHidden: hidden, updatedAt: new Date() })
    .where(eq(courses.id, id));
  revalidatePath("/settings");
  revalidatePath("/school");
  revalidatePath("/");
  return { ok: true as const };
}
