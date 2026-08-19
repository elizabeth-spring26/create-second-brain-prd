import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/becoming.db";
const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const t = await c.execute(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name",
);
console.log(`TABLES (${t.rows.length}):`);
for (const r of t.rows) {
  const cols = await c.execute(`pragma table_info(${r.name})`);
  console.log(`  ${String(r.name).padEnd(20)} ${cols.rows.length} cols`);
}

const i = await c.execute(
  "select name from sqlite_master where type='index' and name not like 'sqlite_%' order by name",
);
console.log(`\nUNIQUE INDEXES (${i.rows.length}):`);
for (const r of i.rows) console.log(`  ${r.name}`);
