// One-shot: apply supabase/full_schema.sql to a project via the Supabase
// Management API. Usage: node scripts/apply-schema.mjs <projectRef> <accessToken>
// Writes the result to scripts/apply-schema-result.txt (secrets are NOT written).
import { readFileSync, writeFileSync } from "node:fs";

const ref = process.argv[2];
const token = process.argv[3];
if (!ref || !token) {
  console.error("Usage: node scripts/apply-schema.mjs <projectRef> <accessToken>");
  process.exit(2);
}

const sql = readFileSync(new URL("../supabase/full_schema.sql", import.meta.url), "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
const out = `STATUS ${res.status}\n${text.slice(0, 4000)}\n`;
writeFileSync(new URL("./apply-schema-result.txt", import.meta.url), out);
console.log(out);
process.exit(res.ok ? 0 : 1);
