"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export function ConnectGoogleButton({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    const supabase = createClient();
    // access_type=offline + prompt=consent forces Google to return a refresh
    // token even for a user who already signed in with default scopes —
    // without both, provider_refresh_token comes back empty on the callback.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: SCOPES,
        redirectTo: `${window.location.origin}/connect/google/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        connected
          ? "border-border-strong bg-surface-2 text-ink hover:bg-border-strong"
          : "border-accent-lime/40 bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20"
      }`}
    >
      {loading && <Loader2 size={12} className="animate-spin" />}
      {connected ? "Reconnect" : "Connect"}
    </button>
  );
}
