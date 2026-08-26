"use client";

import { useRef, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileCheck2, ShieldAlert, Wrench, Gauge } from "lucide-react";
import type { AuditLogRow } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

function latestByFile(rows: AuditLogRow[]) {
  const map = new Map<string, AuditLogRow>();
  for (const r of rows) map.set(r.file_name, r);
  return [...map.values()];
}

export function StatTiles({ rows }: { rows: AuditLogRow[] }) {
  const scope = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const latest = latestByFile(rows);
    const approved = latest.filter((r) => r.status === "approved").length;
    const repaired = latest.filter((r) => r.status === "repaired").length;
    const quarantined = latest.filter((r) => r.status === "quarantined").length;
    const inspectorRows = rows.filter((r) => r.stage === "inspector" && r.risk_score != null);
    const avgRisk =
      inspectorRows.length > 0
        ? Math.round(
            inspectorRows.reduce((sum, r) => sum + (r.risk_score ?? 0), 0) / inspectorRows.length
          )
        : 0;

    return [
      { label: "Documents Processed", value: latest.length, icon: FileCheck2, color: "var(--color-accent-blue)" },
      { label: "Approved / Repaired", value: approved + repaired, icon: Wrench, color: "var(--color-status-good)" },
      { label: "Quarantined", value: quarantined, icon: ShieldAlert, color: "var(--color-status-critical)" },
      { label: "Avg Risk Score", value: avgRisk, icon: Gauge, color: "var(--color-status-warning)" },
    ];
  }, [rows]);

  useGSAP(
    () => {
      gsap.from(".stat-tile", {
        opacity: 0,
        y: 24,
        scale: 0.96,
        duration: 0.5,
        stagger: 0.08,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
    },
    // Entrance plays once on mount, values update reactively afterward — see
    // the note in PipelineStrip.tsx for why this isn't dependency-driven.
    { scope }
  );

  return (
    <div ref={scope} className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="stat-tile card-surface p-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{
              boxShadow: `0 0 14px 1px color-mix(in srgb, ${s.color} 45%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${s.color} 14%, transparent)`,
            }}
          >
            <s.icon size={18} style={{ color: s.color }} />
          </div>
          <div className="mt-4 font-mono text-3xl font-medium tabular-nums" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="mt-1 text-xs text-ink-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
