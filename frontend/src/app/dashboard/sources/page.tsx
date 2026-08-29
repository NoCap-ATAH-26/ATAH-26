import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GlowCard } from "@/components/ui/spotlight-card";
import { ConnectGoogleButton } from "@/components/ConnectGoogleButton";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SOURCES } from "@/lib/sources";
import type { SourceConnectionRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Connect Sources — NoCap",
};

function ConnectionPill({ status }: { status: SourceConnectionRow["status"] | "coming_soon" }) {
  const config = {
    connected: { label: "Connected", colorVar: "var(--color-status-good)" },
    disconnected: { label: "Not connected", colorVar: "var(--color-ink-faint)" },
    error: { label: "Error", colorVar: "var(--color-status-critical)" },
    coming_soon: { label: "Coming soon", colorVar: "var(--color-accent-gold)" },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide"
      style={{
        color: config.colorVar,
        borderColor: `color-mix(in srgb, ${config.colorVar} 45%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${config.colorVar} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.colorVar }} />
      {config.label}
    </span>
  );
}

export default async function SourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("source_connections_public").select("*");
  const rows = (data ?? []) as SourceConnectionRow[];
  const byKey = new Map(rows.map((r) => [r.source, r]));

  return (
    <main className="min-h-screen bg-bg text-ink">
      <DashboardHeader connected={false} email={user?.email ?? null} />
      <div className="space-y-8 px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
        <header>
          <h1 className="font-display text-2xl italic">Connect Sources</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Connect a data source once, and NoCap watches it continuously — new or changed
            content flows straight into Inspector → Repair → Verifier, the same as a manual
            upload. Every connection is read-only and scoped to exactly what&rsquo;s listed below.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((s) => {
            const row = byKey.get(s.key);
            const connected = row?.status === "connected";
            const status: SourceConnectionRow["status"] | "coming_soon" = s.needs
              ? "coming_soon"
              : (row?.status ?? "disconnected");

            return (
              <GlowCard
                key={s.key}
                customSize
                glowColor={connected ? "mint" : "blue"}
                className="flex flex-col gap-3 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                      <s.icon size={16} className="text-ink-muted" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-ink">{s.label}</h3>
                      {connected && row?.display_name && (
                        <p className="text-xs text-ink-faint">{row.display_name}</p>
                      )}
                    </div>
                  </div>
                  <ConnectionPill status={status} />
                </div>

                <p className="text-xs leading-relaxed text-ink-muted">{s.access}</p>

                {s.needs ? (
                  <p className="mt-auto text-[11px] leading-relaxed text-ink-faint">
                    Needs: {s.needs}
                  </p>
                ) : s.key === "google" ? (
                  <div className="mt-auto pt-1">
                    <ConnectGoogleButton connected={connected} />
                  </div>
                ) : null}
              </GlowCard>
            );
          })}
        </div>
      </div>
    </main>
  );
}
