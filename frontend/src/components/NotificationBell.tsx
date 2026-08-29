"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useNotifications, type Notification, type Severity } from "@/hooks/useNotifications";

const SEVERITY_CONFIG: Record<Severity, { emoji: string; dot: string; label: string }> = {
  critical: { emoji: "🔴", dot: "bg-red-400", label: "Critical" },
  important: { emoji: "🟠", dot: "bg-amber-400", label: "Important" },
  info: { emoji: "🔵", dot: "bg-blue-400", label: "Information" },
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

  return (
    <div className="border-b border-ink-muted/10 last:border-b-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="mt-0.5 text-sm leading-none">{config.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {config.label}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {timeAgo(notification.timestamp)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink">{notification.file_name}</p>
          {!expanded && (
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {notification.what_changed}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-1.5 px-4 pb-3 pl-[34px] text-xs">
          <p className="text-ink-muted">
            <span className="text-ink">{notification.what_changed}</span>
          </p>
          <p className="text-ink-muted">
            <span className="font-medium text-ink">Impact:</span> {notification.impact}
          </p>
          <p className="text-ink-muted">
            <span className="font-medium text-ink">Source:</span> {notification.source}
          </p>
          <p className="text-ink-muted">
            <span className="font-medium text-ink">Recommended action:</span>{" "}
            {notification.recommended_action}
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
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink-muted/20 text-ink hover:border-ink-muted/40"
        aria-label="Notifications"
      >
        🔔
        {criticalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {criticalCount > 9 ? "9+" : criticalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[28rem] w-80 overflow-y-auto rounded-xl border border-ink-muted/20 bg-bg shadow-xl">
          <div className="border-b border-ink-muted/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">🔔 Notifications</h3>
          </div>
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              No notifications yet.
            </p>
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