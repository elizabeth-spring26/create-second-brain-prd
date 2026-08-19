import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./core";

export const SYNC_PROVIDERS = ["canvas", "google_calendar", "granola"] as const;

export const syncState = sqliteTable(
  "sync_state",
  {
    id: id(),
    provider: text("provider", { enum: SYNC_PROVIDERS }).notNull(),
    /** Google's opaque syncToken, or a watermark for the cursor-based APIs. */
    syncToken: text("sync_token"),
    /** AES-256-GCM ciphertext. Never sent to the client, never logged. */
    refreshToken: text("refresh_token"),
    lastSuccessAt: integer("last_success_at", { mode: "timestamp" }),
    lastError: text("last_error"),
    lastErrorAt: integer("last_error_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("sync_state_provider_idx").on(t.provider)],
);
