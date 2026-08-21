// Next.js inlines NEXT_PUBLIC_* at build time, so a dev server started before
// .env.local existed (or from the wrong directory) ships blank credentials and
// Supabase answers with a confusing "Invalid API key". Fail with the real
// reason instead.
export function requireSupabaseEnv(url: string | undefined, key: string | undefined) {
  // Trimmed defensively: a value pasted into Vercel's env var UI with a
  // trailing newline or wrapping quote isn't blank, so the check above
  // wouldn't catch it — but Supabase matches the apikey header byte-for-byte,
  // so it rejects the corrupted key with the same "Invalid API key" message
  // as a missing one. That exact failure has happened twice on this key.
  const trimmedUrl = url?.trim();
  const trimmedKey = key?.trim().replace(/^["']|["']$/g, "");

  if (!trimmedUrl || !trimmedKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart the dev server."
    );
  }
  return { url: trimmedUrl, key: trimmedKey };
}
