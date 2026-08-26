import type { ComponentType } from "react";
import { CheckCircle2, AlertTriangle, Wrench, ShieldAlert } from "lucide-react";
import type { Status } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

const ICON: Record<Status, ComponentType<{ size?: number; className?: string }>> = {
  approved: CheckCircle2,
  needs_repair: AlertTriangle,
  repaired: Wrench,
  quarantined: ShieldAlert,
};

export function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const Icon = ICON[status];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wide ${pad}`}
      style={{
        color: meta.colorVar,
        borderColor: meta.colorVar,
        backgroundColor: `color-mix(in srgb, ${meta.colorVar} 12%, transparent)`,
        boxShadow: `0 0 14px -4px color-mix(in srgb, ${meta.colorVar} 65%, transparent)`,
      }}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {meta.label}
    </span>
  );
}
