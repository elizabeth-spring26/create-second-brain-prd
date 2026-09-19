"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses } from "@/db/schema";

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
