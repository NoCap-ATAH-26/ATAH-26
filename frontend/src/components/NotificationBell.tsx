"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Bell, CircleAlert, TriangleAlert, Info } from "lucide-react";
import { useNotifications, type Notification, type Severity } from "@/hooks/useNotifications";

const SEVERITY_CONFIG: Record<
  Severity,
  { icon: typeof Bell; colorVar: string; label: string }
> = {
  critical: { icon: CircleAlert, colorVar: "var(--color-status-critical)", label: "Critical" },
  important: { icon: TriangleAlert, colorVar: "var(--color-status-warning)", label: "Important" },
  info: { icon: Info, colorVar: "var(--color-status-good)", label: "Information" },
};

function timeAgo(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(isoTimestamp).toLocaleDateString();
}

function NotificationRow({ notification }: { notification: Notification }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[notification.severity] ?? SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-surface-2"
      >
        <Icon size={14} className="mt-0.5 shrink-0" style={{ color: config.colorVar }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: config.colorVar }}
            >
              {config.label}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-ink-faint">
              {timeAgo(notification.timestamp)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink">{notification.file_name}</p>
          {!expanded && (
            <p className="mt-0.5 truncate text-xs text-ink-muted">{notification.what_changed}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-1.5 px-4 pb-3 pl-[30px] text-xs">
          <p className="text-ink-muted">
            <span className="text-ink">{notification.what_changed}</span>
          </p>
          <p className="text-ink-muted">
            <span className="text-ink">Impact:</span> {notification.impact}
          </p>
          <p className="text-ink-muted">
            <span className="text-ink">Source:</span> {notification.source}
          </p>
          <p className="text-ink-muted">
            <span className="text-ink">Recommended action:</span> {notification.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { notifications, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const criticalCount = useMemo(
    () => notifications.filter((n) => n.severity === "critical").length,
    [notifications]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-ink transition hover:bg-surface-2"
        aria-label="Notifications"
      >
        <Bell size={13} />
        {criticalCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-medium text-white"
            style={{ backgroundColor: "var(--color-status-critical)" }}
          >
            {criticalCount > 9 ? "9+" : criticalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[28rem] w-80 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bell size={13} className="text-ink-muted" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              Notifications
            </h3>
          </div>
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No notifications yet.</p>
          )}
          {!loading &&
            notifications.map((n, i) => (
              <NotificationRow key={`${n.file_name}-${n.timestamp}-${i}`} notification={n} />
            ))}
        </div>
      )}
    </div>
  );
}
