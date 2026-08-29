export type Stage = "inspector" | "repair" | "verifier";

export type Status =
  | "approved"
  | "needs_repair"
  | "repaired"
  | "quarantined";

export interface AuditLogRow {
  id: number;
  file_name: string;
  stage: Stage;
  status: Status;
  risk_score: number | null;
  issues: string[] | null;
  source_files: string[] | null;
  reason: string | null;
  changes_made: string[] | null;
  remaining_issues: string[] | null;
  published_path: string | null;
  logged_at: string;
}

export const STATUS_META: Record<
  Status,
  { label: string; colorVar: string }
> = {
  approved: { label: "Approved", colorVar: "var(--color-status-good)" },
  needs_repair: { label: "Needs Repair", colorVar: "var(--color-status-warning)" },
  repaired: { label: "Repaired", colorVar: "var(--color-status-serious)" },
  quarantined: { label: "Quarantined", colorVar: "var(--color-status-critical)" },
};

export const STAGE_LABEL: Record<Stage, string> = {
  inspector: "Inspector",
  repair: "Repair",
  verifier: "Verifier",
};

export type ConnectionStatus = "disconnected" | "connected" | "error";

export interface SourceConnectionRow {
  id: string;
  source: string;
  status: ConnectionStatus;
  display_name: string | null;
  scopes: string[] | null;
  connected_at: string | null;
  updated_at: string;
}
