// Next.js inlines NEXT_PUBLIC_* at build time, so a dev server started before
// .env.local existed (or from the wrong directory) ships blank credentials and
// Supabase answers with a confusing "Invalid API key". Fail with the real
// reason instead.
export function requireSupabaseEnv(url: string | undefined, key: string | undefined) {
  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart the dev server."
    );
  }
  return { url, key };
}
