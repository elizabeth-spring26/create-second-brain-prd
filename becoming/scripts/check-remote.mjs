import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const lines = readFileSync(".env.local", "utf8").split("\n");
const val = (n) => {
  const l = lines.find((x) => x.startsWith(`${n}=`));
  return l ? l.slice(n.length + 1).trim() : "";
};

const c = createClient({ url: val("TURSO_REMOTE_URL"), authToken: val("TURSO_REMOTE_TOKEN") });

const t = await c.execute(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name",
);
console.log(`REMOTE TABLES (${t.rows.length}):`);
for (const r of t.rows) {
  const n = await c.execute(`select count(*) as n from ${r.name}`);
  console.log(`  ${String(r.name).padEnd(20)} ${n.rows[0].n} rows`);
}
