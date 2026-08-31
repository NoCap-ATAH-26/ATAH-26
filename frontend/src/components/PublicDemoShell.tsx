"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { initReducedMotion } from "@/lib/motion-setup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatTiles } from "@/components/StatTiles";
import { PipelineStrip } from "@/components/PipelineStrip";
import { ScoreChart } from "@/components/ScoreChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DocumentViewer } from "@/components/DocumentViewer";
import { GlowCard } from "@/components/ui/spotlight-card";
import SmokeyCursor from "@/components/ui/smokey-cursor";

export function PublicDemoShell() {
  const { rows, connected } = useAuditLog();

  useEffect(() => {
    initReducedMotion();
  }, []);

  // The single strongest proof point: a document engineered to manipulate
  // the AI evaluator itself, caught live. Found dynamically from real rows,
  // not hardcoded, so this stays honest if the underlying data ever changes.
  const securityMoment = useMemo(
    () =>
      rows.find(
        (r) =>
          r.stage === "inspector" &&
          r.status === "quarantined" &&
          (r.risk_score ?? 0) >= 90
      ),
    [rows]
  );

  return (
    <main className="ambient-glow relative z-10 flex-1">
      <SmokeyCursor />

      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-ink">NOCAP.DEV</span>
          <span className="hidden text-ink-faint sm:inline">/</span>
          <span className="hidden text-sm text-ink-muted sm:inline">Live Demo &mdash; no login required</span>
        </div>

        <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-ink-muted">
          <span
            className={connected ? "text-accent-lime" : ""}
            style={
              connected
                ? { textShadow: "0 0 10px color-mix(in srgb, var(--color-accent-lime) 70%, transparent)" }
                : undefined
            }
          >
            Status[{connected ? "●" : "○"}]
          </span>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 normal-case tracking-normal text-ink transition hover:bg-surface-2"
          >
            Sign in for the full dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">
              Every row below is a real, live decision.
            </h1>
            <p className="max-w-2xl text-sm text-ink-muted">
              This page reads the same audit trail the pipeline itself writes to, in real
              time. Nothing here is staged or replayed for this view.
            </p>
          </div>

          {securityMoment && (
            <GlowCard customSize glowColor="red" className="flex items-start gap-4 p-5">
              <ShieldAlert size={28} className="mt-0.5 shrink-0" style={{ color: "var(--color-status-critical)" }} />
              <div className="space-y-1.5">
                <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-status-critical)" }}>
                  Security moment &mdash; risk score {securityMoment.risk_score}
                </p>
                <p className="text-sm text-ink">
                  <span className="font-mono">{securityMoment.file_name}</span> was engineered to manipulate
                  Inspector into approving itself. Inspector caught it and quarantined it instead.
                </p>
                {securityMoment.reason && (
                  <p className="text-xs text-ink-muted">{securityMoment.reason}</p>
                )}
              </div>
            </GlowCard>
          )}

          <StatTiles rows={rows} />
          <PipelineStrip rows={rows} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <ScoreChart rows={rows} />
            <ActivityFeed rows={rows} />
          </div>

          <DocumentViewer rows={rows} />
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center font-mono text-[11px] text-ink-faint">
        NoCap &mdash; Taskmaster track, All Things Agentic Hackathon
      </footer>
    </main>
  );
}
