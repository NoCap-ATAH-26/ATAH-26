// Deliberately server-only (no NEXT_PUBLIC_ prefix) — this key can send email
// on the project's behalf and must never reach the browser bundle.
export function requireResendEnv(apiKey: string | undefined, from: string | undefined) {
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Set it in frontend/.env.local, then restart the dev server."
    );
  }
  return {
    apiKey,
    // resend.dev's shared sandbox sender works with no domain setup, but only
    // delivers to the address that owns the API key. Point RESEND_FROM_EMAIL
    // at a verified domain sender before sending to real recipients.
    from: from ?? "onboarding@resend.dev",
  };
}
