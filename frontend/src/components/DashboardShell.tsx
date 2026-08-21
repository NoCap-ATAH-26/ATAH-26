"use client";

import { useEffect } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { initReducedMotion } from "@/lib/motion-setup";
import { initSmoothScroll } from "@/lib/smooth-scroll";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StatTiles } from "@/components/StatTiles";
import { PipelineStrip } from "@/components/PipelineStrip";
import { ScoreChart } from "@/components/ScoreChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentUpload } from "@/components/DocumentUpload";

export function DashboardShell({ email }: { email: string | null }) {
  const { rows, connected } = useAuditLog();
  useEffect(() => {
    initReducedMotion();
    initSmoothScroll();
  }, []);

  return (
    <main className="flex-1">
      <DashboardHeader connected={connected} email={email} />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <StatTiles rows={rows} />
          <DocumentUpload />
          <PipelineStrip rows={rows} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <ScoreChart rows={rows} />
            <ActivityFeed rows={rows} />
          </div>

          <DocumentViewer rows={rows} />
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center font-mono text-[11px] text-ink-faint">
        NoCap — Taskmaster track, All Things Agentic Hackathon
      </footer>
    </main>
  );
}
