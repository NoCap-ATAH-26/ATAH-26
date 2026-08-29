import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS, so this must never be imported by
 * client components. Used only where a server route needs to write to
 * tables like source_connections that hold real secrets (tokens) and
 * intentionally have no public write policy.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin credentials. Set SUPABASE_SERVICE_ROLE_KEY in " +
        "Vercel's project environment variables (Settings → Environment Variables)."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
