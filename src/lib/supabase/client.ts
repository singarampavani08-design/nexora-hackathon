import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Shared Supabase client (browser). Uses ONLY the public publishable key —
 * the service-role secret must never appear in frontend code.
 * Config comes from Vite env vars (see .env.example).
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (see .env.example).",
    );
  }

  const isBrowser = typeof window !== "undefined";
  client = createClient(url, anonKey, {
    auth: { persistSession: isBrowser, autoRefreshToken: isBrowser },
  });
  return client;
}
