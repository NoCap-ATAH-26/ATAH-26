import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

/**
 * Callback for the "Connect Google" button on /dashboard/sources — separate
 * from /auth/callback (plain sign-in) because this one also needs to read
 * provider_token/provider_refresh_token off the session and persist them
 * into source_connections for drive_client.py/gmail_client.py to use.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/sources?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[connect/google/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(`${origin}/dashboard/sources?error=auth_failed`);
  }

  const { session } = data;
  const refreshToken = session.provider_refresh_token;

  if (!refreshToken) {
    // Google only returns a refresh token on the first consent, or when
    // prompt=consent forces re-consent -- the sign-in button in LoginForm.tsx
    // doesn't pass that, so a user who already granted default sign-in scopes
    // needs to hit *this* button (which does) to get one.
    console.error("[connect/google/callback] no provider_refresh_token on session");
    return NextResponse.redirect(`${origin}/dashboard/sources?error=no_refresh_token`);
  }

  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from("source_connections")
    .update({
      status: "connected",
      display_name: session.user.email,
      scopes: SCOPES,
      access_token: session.provider_token,
      refresh_token: refreshToken,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("source", "google");

  if (upsertError) {
    console.error("[connect/google/callback] failed to store connection:", upsertError.message);
    return NextResponse.redirect(`${origin}/dashboard/sources?error=storage_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard/sources?connected=google`);
}
