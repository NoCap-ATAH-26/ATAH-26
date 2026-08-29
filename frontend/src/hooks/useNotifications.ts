"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Severity = "critical" | "important" | "info";

export type Notification = {
  file_name: string;
  stage: string;
  status: string;
  severity: Severity;
  title: string;
  what_changed: string;
  all_issues: string[];
  impact: string;
  source: string;
  recommended_action: string;
  reason: string;
  timestamp: string;
};

/**
 * Live-subscribes to the 50 most recent notifications, newest first.
 * Updates automatically whenever backend/notifier.py's notify() writes a
 * row to Supabase's "notifications" table — no manual refresh needed.
 */
export function useNotifications() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);

      if (!active) return;
      if (!error && data) setNotifications(data as Notification[]);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel("notifications_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { notifications, loading };
}
