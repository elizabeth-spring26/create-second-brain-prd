"use server";

import { revalidatePath } from "next/cache";
import { syncCanvas } from "@/lib/canvas/sync";
import { syncGranola } from "@/lib/granola/sync";

/** Manual "Sync now" buttons. */

export async function runCanvasSync() {
  const res = await syncCanvas();
  revalidatePath("/school");
  revalidatePath("/settings");
  return res;
}

export async function runGranolaSync() {
  const res = await syncGranola();
  revalidatePath("/school");
  revalidatePath("/work");
  revalidatePath("/settings");
  return res;
}
