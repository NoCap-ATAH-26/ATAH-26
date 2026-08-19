import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

export function createClient() {
  const { url, key } = requireSupabaseEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return createBrowserClient(url, key);
}
