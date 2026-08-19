import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import { test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { assignments, meetings } from "../db/schema";
import { syncCanvas } from "../lib/canvas/sync";
import { syncGranola } from "../lib/granola/sync";
import { bestStreak, consistency, currentStreak } from "../lib/streaks";

/**
 * These run against the live Canvas and Granola APIs and the local database.
 * They exist because the two failure modes they cover are silent: an overlay
 * quietly erased, and a note quietly duplicated.
 */

test("canvas sync never overwrites her overlay fields", async () => {
  const first = await syncCanvas();
  assert.equal(first.ok, true, `first sync failed: ${JSON.stringify(first)}`);

  const rows = await db.select().from(assignments).limit(1);
  if (rows.length === 0) {
    console.log("  (no Canvas assignments returned — nothing to assert against)");
    return;
  }
  const target = rows[0];

  // Simulate her having set all three overlay fields by hand.
  await db
    .update(assignments)
    .set({ myStatus: "in_progress", myPriority: "high", estMinutes: 137 })
    .where(eq(assignments.id, target.id));

  const second = await syncCanvas();
  assert.equal(second.ok, true, `second sync failed: ${JSON.stringify(second)}`);

  const after = (
    await db.select().from(assignments).where(eq(assignments.id, target.id))
  )[0];

  assert.equal(after.myStatus, "in_progress", "my_status was overwritten by sync");
  assert.equal(after.myPriority, "high", "my_priority was overwritten by sync");
  assert.equal(after.estMinutes, 137, "est_minutes was overwritten by sync");
});

test("granola sync is idempotent — no duplicate notes on a second run", async () => {
  const first = await syncGranola();
  assert.equal(first.ok, true, `first sync failed: ${JSON.stringify(first)}`);

  const countRows = async () => {
    const r = await db.select({ n: sql<number>`count(*)` }).from(meetings);
    return Number(r[0].n);
  };
  const afterFirst = await countRows();

  const second = await syncGranola();
  assert.equal(second.ok, true, `second sync failed: ${JSON.stringify(second)}`);
  const afterSecond = await countRows();

  assert.equal(afterSecond, afterFirst, "a second sync created duplicate meeting rows");

  // And the unique index really is doing its job.
  const dupes = await db
    .select({ id: meetings.granolaNoteId, n: sql<number>`count(*)` })
    .from(meetings)
    .groupBy(meetings.granolaNoteId)
    .having(sql`count(*) > 1`);
  assert.equal(dupes.length, 0, "duplicate granola_note_id rows exist");
});

test("break-habit streaks count clean days, never slips", () => {
  const today = "2026-08-19";
  // Slipped on the 17th only.
  const slips = ["2026-08-17"];

  // Clean on 18th and 19th => current run of 2.
  assert.equal(currentStreak("break", slips, today), 2);

  // A build habit logged on those same days behaves the opposite way.
  assert.equal(currentStreak("build", ["2026-08-19", "2026-08-18"], today), 2);

  // Consistency counts clean days out of the window, so one slip in 30 = 29/30.
  assert.equal(Math.round(consistency("break", slips, 30, today) * 30), 29);

  // Best streak is bounded by the window's start, not all of prehistory.
  assert.equal(bestStreak("break", slips, "2026-08-15", today), 2);
});

test("a build habit not yet logged today is still mid-streak", () => {
  const today = "2026-08-19";
  // Logged through yesterday, nothing today — must not read as a broken streak.
  assert.equal(currentStreak("build", ["2026-08-18", "2026-08-17"], today), 2);
});
