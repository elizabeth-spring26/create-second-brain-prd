import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * libSQL speaks SQLite. Locally that's a file; in production it's Turso over
 * HTTP — Vercel's filesystem is ephemeral, so a file: URL cannot survive there.
 * Same schema and same queries either way.
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:./data/becoming.db";

if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN is required for a remote TURSO_DATABASE_URL");
}

const client = createClient({
  url,
  authToken: url.startsWith("file:") ? undefined : process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { schema };
