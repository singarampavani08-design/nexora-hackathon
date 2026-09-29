#!/usr/bin/env node
/**
 * Applies SQL files (migrations + seed) directly to the Nexora Supabase
 * Postgres instance. Requires SUPABASE_DB_PASSWORD in the environment.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD='...' node scripts/apply-schema.mjs [file1.sql file2.sql ...]
 *
 * No file arguments = apply the default set (schema then seed).
 * The password is read from the environment only — never hardcoded.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Minimal .env loader (no dependency on dotenv).
function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* .env not present — rely on process env */
  }
}
loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
const password = process.env.SUPABASE_DB_PASSWORD;

if (!ref || !password) {
  console.error(
    "Missing VITE_SUPABASE_URL (in .env) or SUPABASE_DB_PASSWORD (in environment).",
  );
  process.exit(1);
}

const connStr = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
const sql = postgres(connStr, { ssl: "require", max: 1, connect_timeout: 20 });

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["supabase/migrations/0001_init.sql", "supabase/seed.sql"];

try {
  for (const f of files) {
    const content = readFileSync(resolve(root, f), "utf8");
    process.stdout.write(`Applying ${f} ... `);
    await sql.unsafe(content);
    console.log("OK");
  }
  console.log("Done.");
} catch (err) {
  console.error("FAILED:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
