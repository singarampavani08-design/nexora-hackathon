/**
 * Smoke-tests the Supabase setup exactly the way the app will use it:
 * through the anon/publishable key. Verifies RLS-allowed reads, an
 * insert, an update, and cleans up after itself. Run with tsx if
 * available, else with node --experimental-strip-types.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env (no dotenv dep).
try {
  const raw = readFileSync(resolve(root, ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch { /* rely on process env */ }

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, anon);
let failed = false;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failed = true;
};

// 1. Read contacts
const { data: contacts, error: e1 } = await supabase.from("contacts").select("*").order("created_at");
check("contacts readable via anon", !e1 && (contacts?.length ?? 0) === 5, e1?.message ?? `${contacts?.length} rows`);
const rahul = contacts?.find((c) => c.name === "Rahul Sharma");

// 2. Read meetings
const { data: meetings, error: e2 } = await supabase.from("meetings").select("*");
check("meetings readable via anon", !e2 && (meetings?.length ?? 0) === 12, e2?.message ?? `${meetings?.length} rows`);

// 3. Read memories
const { data: memories, error: e3 } = await supabase.from("memories").select("*");
check("memories readable via anon", !e3 && (memories?.length ?? 0) === 26, e3?.message ?? `${memories?.length} rows`);

// 4. Join query (contact + memories)
const { data: joined, error: e4 } = await supabase
  .from("memories")
  .select("content, type, is_open, meetings(title, status), contacts(name)")
  .limit(3);
check("join memories→meetings→contacts works", !e4 && joined?.length === 3, e4?.message ?? "");

// 5. Insert a test meeting (anon, user_id null — policy allows)
const { data: created, error: e5 } = await supabase
  .from("meetings")
  .insert({
    contact_id: rahul.id,
    title: "__smoke_test_meeting__",
    purpose: "Temporary row created by scripts/smoke-test.mjs",
    meeting_date: new Date().toISOString().slice(0, 10),
    status: "upcoming",
  })
  .select("id")
  .single();
check("anon insert meeting (RLS allows user_id null)", !e5 && !!created?.id, e5?.message ?? created?.id);

// 6. UPDATE should be blocked for anon (no UPDATE policy) — row must stay unchanged.
// RLS filters unauthorized updates silently: 0 rows affected, no error.
let updateBlocked = false;
if (created?.id) {
  await supabase.from("meetings").update({ status: "completed" }).eq("id", created.id);
  const { data: after } = await supabase.from("meetings").select("status").eq("id", created.id).single();
  updateBlocked = after?.status === "upcoming";
}
check("anon update blocked by RLS (row unchanged)", updateBlocked);

// 7. DELETE should be blocked for anon (no DELETE policy) — row must still exist.
let deleteBlocked = false;
if (created?.id) {
  await supabase.from("meetings").delete().eq("id", created.id);
  const { data: stillThere } = await supabase.from("meetings").select("id").eq("id", created.id).maybeSingle();
  deleteBlocked = !!stillThere;
}
check("anon delete blocked by RLS (row still present)", deleteBlocked);

// 8. Cleanup test row via direct Postgres (service-side, not exposed to app)
if (created?.id) {
  const { default: postgres } = await import("postgres");
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (pw) {
    const sql = postgres(`postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`, { ssl: "require", max: 1 });
    await sql`delete from meetings where id = ${created.id}`;
    await sql.end({ timeout: 5 });
    console.log("PASS  cleanup of smoke-test row (direct PG)");
  } else {
    console.log("WARN  no SUPABASE_DB_PASSWORD — smoke-test meeting row left in DB");
  }
}

console.log(failed ? "\nSMOKE TEST FAILED" : "\nALL SMOKE TESTS PASSED");
process.exit(failed ? 1 : 0);
