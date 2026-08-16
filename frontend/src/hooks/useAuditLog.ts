"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AuditLogRow } from "@/lib/types";

export function useAuditLog() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("logged_at", { ascending: true })
        .limit(500);

      if (!active) return;
      if (!error && data) setRows(data as AuditLogRow[]);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel("audit_log_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          setRows((prev) => [...prev, payload.new as AuditLogRow]);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { rows, loading, connected };
}
