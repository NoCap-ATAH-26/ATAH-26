"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot,
} from "recharts";
import type { AuditLogRow, Status } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

// Sourced from STATUS_META rather than re-listing the hexes, so these follow
// the theme's status tokens instead of silently keeping the dark-theme values.
const STATUS_COLOR: Record<Status, string> = {
  approved: STATUS_META.approved.colorVar,
  needs_repair: STATUS_META.needs_repair.colorVar,
  repaired: STATUS_META.repaired.colorVar,
  quarantined: STATUS_META.quarantined.colorVar,
};

function CustomDot(props: unknown) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { status: Status } };
  if (cx == null || cy == null) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={4}
      fill={STATUS_COLOR[payload.status]}
      stroke="var(--color-bg)"
      strokeWidth={1.5}
    />
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AuditLogRow & { t: number } }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card-surface max-w-[240px] px-3 py-2 text-xs">
      <div className="font-mono text-ink-muted">{row.file_name}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[row.status] }} />
        <span style={{ color: STATUS_COLOR[row.status] }}>{STATUS_META[row.status].label}</span>
      </div>
      {row.risk_score != null && (
        <div className="mt-1 font-mono text-ink">risk {row.risk_score}</div>
      )}
    </div>
  );
}

export function ScoreChart({ rows }: { rows: AuditLogRow[] }) {
  const scope = useRef<HTMLDivElement>(null);

  const data = useMemo(
    () =>
      rows
        .filter((r) => r.risk_score != null)
        .map((r, i) => ({ ...r, t: i, risk_score: r.risk_score ?? 0 })),
    [rows]
  );

  useGSAP(
    () => {
      gsap.from(scope.current, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
    },
    // Entrance plays once on mount — see the note in PipelineStrip.tsx.
    { scope }
  );

  return (
    <div ref={scope} className="card-surface glow-mint p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl italic">Risk Score, Live</h3>
          <p className="text-xs text-ink-muted">Every Inspector decision, in order seen</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              {STATUS_META[s].label}
            </div>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-ink-faint">
          Waiting for the first decision...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-lime)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-accent-lime)" stopOpacity={0} />
              </linearGradient>
              {/* Neon-line glow: a blurred copy of the stroke sits under the
                  crisp one, which is what sells "lit from within" rather than
                  a flat CSS drop-shadow (recharts' Area stroke isn't a real
                  DOM node CSS filters can target reliably). */}
              <filter id="riskLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={[0, 100]}
              width={36}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="risk_score"
              stroke="var(--color-accent-lime)"
              strokeWidth={2}
              filter="url(#riskLineGlow)"
              fill="url(#riskFill)"
              dot={CustomDot}
              activeDot={{ r: 6 }}
              isAnimationActive
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
