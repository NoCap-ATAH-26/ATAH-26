"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileInput, ScanSearch, Wrench, BadgeCheck, ArrowRight } from "lucide-react";
import type { AuditLogRow } from "@/lib/types";
import { GlowCard } from "@/components/ui/spotlight-card";

gsap.registerPlugin(ScrollTrigger);

export function PipelineStrip({ rows }: { rows: AuditLogRow[] }) {
  const scope = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const inspector = rows.filter((r) => r.stage === "inspector");
    const repair = rows.filter((r) => r.stage === "repair");
    const verifier = rows.filter((r) => r.stage === "verifier");
    const published = rows.filter((r) => r.published_path).length;
    return {
      ingested: new Set(rows.map((r) => r.file_name)).size,
      inspector: inspector.length,
      repair: repair.length,
      verifier: verifier.length,
      published,
    };
  }, [rows]);

  // Each stage gets its own hue rather than repeating mint four times — the
  // pipeline reads left-to-right as a spectrum instead of one accent color
  // with four labels stapled on.
  const stages = [
    {
      key: "ingested",
      label: "Ingested",
      icon: FileInput,
      count: counts.ingested,
      colorVar: "var(--color-accent-lime)",
    },
    {
      key: "inspector",
      label: "Inspector",
      icon: ScanSearch,
      count: counts.inspector,
      colorVar: "var(--color-accent-blue)",
    },
    {
      key: "repair",
      label: "Repair",
      icon: Wrench,
      count: counts.repair,
      colorVar: "var(--color-accent-gold)",
    },
    {
      key: "verifier",
      label: "Verifier",
      icon: BadgeCheck,
      count: counts.verifier,
      colorVar: "var(--color-accent-mauve)",
    },
  ];

  useGSAP(
    () => {
      gsap.from(".pipeline-node", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
      gsap.from(".pipeline-arrow", {
        opacity: 0,
        scaleX: 0,
        duration: 0.4,
        stagger: 0.1,
        transformOrigin: "left center",
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
      gsap.to(".flow-pulse", {
        backgroundPosition: "200% center",
        duration: 2.5,
        repeat: -1,
        ease: "none",
      });
    },
    // Entrance plays once on mount. Counts update via plain React re-renders
    // afterward — re-running this on every data change raced fresh
    // gsap.from() resets against a ScrollTrigger that had already fired,
    // leaving nodes stuck at opacity 0.
    { scope }
  );

  return (
    <GlowCard ref={scope} customSize glowColor="blue" className="scrollbar-ghost overflow-x-auto p-6">
      <div className="mb-5">
        <h3 className="font-display text-xl italic">The Pipeline, Live</h3>
        <p className="text-xs text-ink-muted">Event-driven: Pub/Sub routes each stage automatically, no human between steps</p>
      </div>
      <div className="flex min-w-max items-center gap-2">
        {stages.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className="pipeline-node flex w-32 flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-5"
              style={
                s.count > 0
                  ? { borderColor: `color-mix(in srgb, ${s.colorVar} 45%, var(--color-border))` }
                  : undefined
              }
            >
              <s.icon size={20} style={{ color: s.colorVar }} />
              <span className="font-mono text-2xl tabular-nums">{s.count}</span>
              <span className="text-[11px] text-ink-muted">{s.label}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="pipeline-arrow flex items-center">
                <div
                  className="flow-pulse h-[2px] w-10"
                  style={{
                    backgroundImage: `linear-gradient(90deg, var(--color-border) 0%, ${s.colorVar} 50%, var(--color-border) 100%)`,
                    backgroundSize: "200% 100%",
                    filter: `drop-shadow(0 0 6px color-mix(in srgb, ${s.colorVar} 60%, transparent))`,
                  }}
                />
                <ArrowRight size={14} className="text-ink-faint" />
              </div>
            )}
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
