"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DashboardHeader({
  connected,
  email,
}: {
  connected: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold text-ink">NOCAP.DEV</span>
        <span className="hidden text-ink-faint sm:inline">/</span>
        <span className="hidden text-sm text-ink-muted sm:inline">Truth Layer Dashboard</span>
      </div>

      <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-ink-muted">
        <span className={connected ? "text-accent-lime" : ""}>
          Status[{connected ? "●" : "○"}]
        </span>
        {email && <span className="hidden normal-case tracking-normal text-ink-muted sm:inline">{email}</span>}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-ink transition hover:bg-surface-2 disabled:opacity-60"
        >
          <LogOut size={13} />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
