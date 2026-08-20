import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "./index";
import { engagements, habits, offerCriteria, settings } from "./schema";
import { SEED_ENGAGEMENTS, SEED_HABITS, SEED_OFFER_CRITERIA, SEED_SETTINGS } from "./seed-data";

/**
 * Idempotent. Matches on natural keys (habit name, criterion label, engagement
 * name) so re-running never duplicates and never clobbers edits made in the UI.
 */
async function main() {
  let created = 0;
  let skipped = 0;

  // ── settings: exactly one row ──────────────────────────────────────────────
  const existingSettings = await db.select().from(settings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settings).values(SEED_SETTINGS);
    console.log("settings           + created");
    created++;
  } else {
    // Backfill only the fields still unset — never overwrite a real choice.
    const row = existingSettings[0];
    const patch: Partial<typeof SEED_SETTINGS> = {};
    for (const [k, v] of Object.entries(SEED_SETTINGS) as [
      keyof typeof SEED_SETTINGS,
      unknown,
    ][]) {
      if (row[k] === null || row[k] === undefined) {
        Object.assign(patch, { [k]: v });
      }
    }
    if (Object.keys(patch).length > 0) {
      await db.update(settings).set(patch).where(eq(settings.id, row.id));
      console.log(`settings           ~ filled ${Object.keys(patch).join(", ")}`);
      created++;
    } else {
      console.log("settings           · complete");
      skipped++;
    }
  }

  // ── habits ─────────────────────────────────────────────────────────────────
  for (const [i, h] of SEED_HABITS.entries()) {
    const found = await db.select().from(habits).where(eq(habits.name, h.name)).limit(1);
    if (found.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(habits).values({ ...h, sortOrder: i, pinned: Boolean(h.pinned) });
    console.log(`habit              + ${h.name} (${h.direction})`);
    created++;
  }

  // Backfill pins for habits that already existed before `pinned` was added.
  // Only runs when nothing is pinned, so it never overrides her own choices.
  const anyPinned = (await db.select().from(habits)).some((h) => h.pinned);
  if (!anyPinned) {
    const wanted = SEED_HABITS.filter((h) => h.pinned).map((h) => h.name);
    for (const name of wanted) {
      await db.update(habits).set({ pinned: true }).where(eq(habits.name, name));
    }
    if (wanted.length > 0) {
      console.log(`habits             ~ pinned ${wanted.length} to Today`);
      created++;
    }
  }

  // ── offer criteria ─────────────────────────────────────────────────────────
  for (const [i, label] of SEED_OFFER_CRITERIA.entries()) {
    const found = await db
      .select()
      .from(offerCriteria)
      .where(eq(offerCriteria.label, label))
      .limit(1);
    if (found.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(offerCriteria).values({ label, weight: 3, sortOrder: i });
    console.log(`offer criterion    + ${label}`);
    created++;
  }

  // ── engagements ────────────────────────────────────────────────────────────
  for (const e of SEED_ENGAGEMENTS) {
    const found = await db
      .select()
      .from(engagements)
      .where(eq(engagements.name, e.name))
      .limit(1);
    if (found.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(engagements).values(e);
    console.log(`engagement         + ${e.name} (${e.kind})`);
    created++;
  }

  console.log(`\ndone — ${created} created, ${skipped} already present`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
