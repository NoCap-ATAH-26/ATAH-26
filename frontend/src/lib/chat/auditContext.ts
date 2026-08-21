import { STAGE_LABEL, STATUS_META, type AuditLogRow } from "@/lib/types";

const MAX_ROWS = 50;
const MAX_REASON_CHARS = 140;
const MAX_ISSUES_SHOWN = 3;

type AuditContextRow = Pick<
  AuditLogRow,
  "file_name" | "stage" | "status" | "risk_score" | "reason" | "issues" | "remaining_issues" | "published_path" | "logged_at"
>;

export const AUDIT_CONTEXT_COLUMNS =
  "file_name, stage, status, risk_score, reason, issues, remaining_issues, published_path, logged_at";
export const AUDIT_CONTEXT_LIMIT = MAX_ROWS;

/**
 * Turns raw audit_log rows into a compact, model-readable snapshot of real
 * pipeline activity — without this, the assistant only had a generic
 * paragraph describing what NoCap does in the abstract, with no way to
 * answer questions about actual documents, statuses, or results.
 */
export function buildAuditContext(rows: AuditContextRow[]): string {
  if (rows.length === 0) {
    return "The pipeline has not logged any activity yet — there is nothing in audit_log to report.";
  }

  const byStage = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const r of rows) {
    byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + 1);
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  }

  const summarize = (m: Map<string, number>, labels: Record<string, string>) =>
    [...m.entries()].map(([k, v]) => `${labels[k] ?? k}=${v}`).join(", ");

  const summary =
    `Showing the ${rows.length} most recent pipeline events (of possibly more overall). ` +
    `By stage: ${summarize(byStage, STAGE_LABEL)}. ` +
    `By status: ${summarize(byStatus, Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label])))}.`;

  const lines = [...rows]
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .map((r) => {
      const date = r.logged_at.slice(0, 10);
      const risk = r.risk_score !== null ? ` risk=${r.risk_score}` : "";
      const issues =
        r.issues && r.issues.length > 0
          ? ` issues: ${r.issues.slice(0, MAX_ISSUES_SHOWN).join("; ")}${r.issues.length > MAX_ISSUES_SHOWN ? ", ..." : ""}`
          : "";
      const remaining =
        r.remaining_issues && r.remaining_issues.length > 0
          ? ` remaining: ${r.remaining_issues.slice(0, MAX_ISSUES_SHOWN).join("; ")}`
          : "";
      const reason = r.reason ? ` — ${r.reason.slice(0, MAX_REASON_CHARS)}` : "";
      const published = r.published_path ? ` -> ${r.published_path}` : "";
      return `${date} [${STAGE_LABEL[r.stage]}] ${r.file_name}: ${STATUS_META[r.status]?.label ?? r.status}${risk}${issues}${remaining}${reason}${published}`;
    });

  return `${summary}\n\n${lines.join("\n")}`;
}
