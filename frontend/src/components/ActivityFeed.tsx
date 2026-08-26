"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Radio } from "lucide-react";
import type { AuditLogRow } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { GlowCard } from "@/components/ui/spotlight-card";

function narrate(row: AuditLogRow): string {
  const stage = STAGE_LABEL[row.stage];
  switch (row.status) {
    case "approved":
      return `${stage} cleared ${row.file_name}${row.published_path ? ", published live" : ""}.`;
    case "needs_repair":
      return `${stage} flagged ${row.file_name}, risk ${row.risk_score ?? "?"}${
        row.issues?.length ? `: ${row.issues[0]}` : ""
      }`;
    case "repaired":
      return `${stage} rewrote ${row.file_name} using ${row.source_files?.join(", ") || "approved sources"}.`;
    case "quarantined":
      return `${stage} blocked ${row.file_name}${row.risk_score ? ` (risk ${row.risk_score})` : ""}.`;
    default:
      return `${stage} processed ${row.file_name}.`;
  }
}

export function ActivityFeed({ rows }: { rows: AuditLogRow[] }) {
  const scope = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<number>());
  const reversed = [...rows].reverse();

  useEffect(() => {
    const newEls: Element[] = [];
    scope.current?.querySelectorAll("[data-row-id]").forEach((el) => {
      const id = Number(el.getAttribute("data-row-id"));
      if (!seen.current.has(id)) {
        seen.current.add(id);
        newEls.push(el);
      }
    });
    if (newEls.length) {
      gsap.from(newEls, {
        opacity: 0,
        x: -16,
        duration: 0.45,
        stagger: 0.05,
        ease: "power2.out",
      });
    }
  }, [rows.length]);

  return (
    <GlowCard customSize glowColor="mauve" className="flex max-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Radio size={14} className="text-accent-mauve" />
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink-muted">Activity Feed</h3>
      </div>
      <div ref={scope} className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {reversed.length === 0 && (
          <div className="px-2 py-8 text-center text-sm text-ink-faint">No activity yet.</div>
        )}
        {reversed.map((row) => (
          <div
            key={row.id}
            data-row-id={row.id}
            className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{narrate(row)}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
                {new Date(row.logged_at).toLocaleTimeString()}
              </p>
            </div>
            <StatusBadge status={row.status} size="sm" />
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
