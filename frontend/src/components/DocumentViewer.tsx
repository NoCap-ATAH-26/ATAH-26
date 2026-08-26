"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { FileText } from "lucide-react";
import type { AuditLogRow } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { GlowCard } from "@/components/ui/spotlight-card";

function latestByFile(rows: AuditLogRow[]) {
  const map = new Map<string, AuditLogRow>();
  for (const r of rows) map.set(r.file_name, r);
  return [...map.values()].sort((a, b) => a.file_name.localeCompare(b.file_name));
}

export function DocumentViewer({ rows }: { rows: AuditLogRow[] }) {
  const files = useMemo(() => latestByFile(rows), [rows]);
  const [selected, setSelected] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected && files.length) setSelected(files[0].file_name);
  }, [files, selected]);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [selected]);

  const active = files.find((f) => f.file_name === selected);
  const history = rows.filter((r) => r.file_name === selected);

  if (files.length === 0) return null;

  return (
    <GlowCard customSize glowColor="gold" className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <div className="border-b border-border md:border-b-0 md:border-r">
        <div className="border-b border-border px-4 py-4 font-mono text-xs uppercase tracking-widest text-ink-muted">
          Documents
        </div>
        <div className="scrollbar-ghost max-h-[360px] overflow-y-auto p-2">
          {files.map((f) => (
            <button
              key={f.file_name}
              onClick={() => setSelected(f.file_name)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                f.file_name === selected ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2"
              }`}
            >
              <FileText size={14} className="shrink-0 text-ink-faint" />
              <span className="truncate">{f.file_name}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={panelRef} className="p-6">
        {active && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-mono text-sm text-ink">{active.file_name}</h4>
              <StatusBadge status={active.status} />
            </div>

            {active.reason && (
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{active.reason}</p>
            )}

            {active.source_files && active.source_files.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">Grounded in</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {active.source_files.map((s) => (
                    <span key={s} className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-ink-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(active.issues?.length || active.changes_made?.length || active.remaining_issues?.length) ? (
              <div className="mt-5">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
                  {active.changes_made?.length ? "Changes made" : "Issues found"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(active.changes_made ?? active.issues ?? active.remaining_issues ?? []).map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-lime" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 border-t border-border pt-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">History</p>
              <div className="mt-2 space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">{STAGE_LABEL[h.stage]}</span>
                    <StatusBadge status={h.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </GlowCard>
  );
}
