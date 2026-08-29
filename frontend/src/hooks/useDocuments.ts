"use client";

import { useMemo } from "react";
import { useAuditLog } from "./useAuditLog";
import type { AuditLogRow, Stage, Status } from "@/lib/types";

export type NoCapStatus = Status;

export interface NoCapDocument {
  file_name: string;
  current_stage: Stage;
  current_status: NoCapStatus;
  risk_score: number | null;
  issues: string[];
  source_files: string[];
  original_text?: string;
  repaired_text?: string;
  activity_log: {
    stage: Stage;
    status: NoCapStatus;
    reason: string | null;
    timestamp: string;
  }[];
}

function toDocument(file_name: string, rows: AuditLogRow[]): NoCapDocument {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
  const latest = sorted[sorted.length - 1];

  return {
    file_name,
    current_stage: latest.stage,
    current_status: latest.status,
    risk_score: latest.risk_score,
    issues: latest.remaining_issues ?? latest.issues ?? [],
    source_files: latest.source_files ?? [],
    activity_log: sorted.map((row) => ({
      stage: row.stage,
      status: row.status,
      reason: row.reason,
      timestamp: row.logged_at,
    })),
  };
}

/**
 * Groups the flat audit_log stream from useAuditLog into one entry per
 * document, using each file's most recent row for its current status.
 */
export function useDocuments() {
  const { rows, loading } = useAuditLog();

  const documents = useMemo<NoCapDocument[]>(() => {
    const byFile = new Map<string, AuditLogRow[]>();
    for (const row of rows) {
      const list = byFile.get(row.file_name);
      if (list) list.push(row);
      else byFile.set(row.file_name, [row]);
    }

    return Array.from(byFile.entries())
      .map(([file_name, fileRows]) => toDocument(file_name, fileRows))
      .sort((a, b) => {
        const aTime = a.activity_log[a.activity_log.length - 1]?.timestamp ?? "";
        const bTime = b.activity_log[b.activity_log.length - 1]?.timestamp ?? "";
        return bTime.localeCompare(aTime);
      });
  }, [rows]);

  return { documents, loading, error: null as string | null };
}
