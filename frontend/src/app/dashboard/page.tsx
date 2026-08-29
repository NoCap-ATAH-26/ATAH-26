"use client";

import { useState, useMemo } from "react";
import { useDocuments, type NoCapDocument, type NoCapStatus } from "@/hooks/useDocuments";
import { NotificationBell } from "@/components/NotificationBell";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  approved: {
    label: "Approved",
    dot: "bg-green-400",
    text: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
  },
  needs_repair: {
    label: "Needs Repair",
    dot: "bg-amber-400",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  quarantined: {
    label: "Quarantined",
    dot: "bg-red-400",
    text: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
};

const STAGE_LABEL: Record<string, string> = {
  inspector: "Inspector",
  repair: "Repair",
  verifier: "Verifier",
};

function StatusPill({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-ink-muted",
    text: "text-ink-muted",
    bg: "bg-ink-muted/10",
    border: "border-ink-muted/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function BatchHealth({ documents }: { documents: NoCapDocument[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { approved: 0, needs_repair: 0, quarantined: 0 };
    for (const doc of documents) {
      if (doc.current_status in c) c[doc.current_status] += 1;
    }
    return c;
  }, [documents]);

  const stats: { key: NoCapStatus; label: string }[] = [
    { key: "approved", label: "Approved" },
    { key: "needs_repair", label: "Needs Repair" },
    { key: "quarantined", label: "Quarantined" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ key, label }) => {
        const config = STATUS_CONFIG[key];
        return (
          <div
            key={key}
            className={`rounded-xl border ${config.border} ${config.bg} px-4 py-3`}
          >
            <div className={`text-2xl font-semibold tabular-nums ${config.text}`}>
              {counts[key]}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityTimeline({ log }: { log: NoCapDocument["activity_log"] }) {
  if (!log || log.length === 0) {
    return <p className="text-sm text-ink-muted">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-ink-muted/20 pl-5">
      {log.map((entry, i) => {
        const config = STATUS_CONFIG[entry.status] ?? {
          dot: "bg-ink-muted",
          text: "text-ink-muted",
        };
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ${config.dot} ring-4 ring-bg`}
            />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {STAGE_LABEL[entry.stage] ?? entry.stage}
              </span>
              <span className="text-xs text-ink-muted">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
            <p className={`mt-0.5 text-sm ${config.text}`}>{entry.status}</p>
            <p className="mt-1 text-sm text-ink-muted">{entry.reason}</p>
          </li>
        );
      })}
    </ol>
  );
}

function BeforeAfterPanel({ doc }: { doc: NoCapDocument }) {
  if (!doc.original_text && !doc.repaired_text) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Original
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-ink-muted/20 bg-black/20 p-3 text-xs text-ink-muted">
          {doc.original_text || "—"}
        </pre>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-accent-lime">
          Repaired
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-accent-lime/20 bg-accent-lime/5 p-3 text-xs text-ink">
          {doc.repaired_text || "Not yet repaired"}
        </pre>
      </div>
    </div>
  );
}

function DocumentDetail({ doc }: { doc: NoCapDocument }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{doc.file_name}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Stage: {STAGE_LABEL[doc.current_stage] ?? doc.current_stage}
            {typeof doc.risk_score === "number" && ` · Risk score: ${doc.risk_score}`}
          </p>
        </div>
        <StatusPill status={doc.current_status} />
      </div>

      {doc.issues && doc.issues.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Issues found
          </div>
          <ul className="space-y-1">
            {doc.issues.map((issue, i) => (
              <li key={i} className="text-sm text-ink-muted">
                · {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.source_files && doc.source_files.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Cited sources
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doc.source_files.map((src) => (
              <span
                key={src}
                className="rounded-md border border-ink-muted/20 px-2 py-0.5 text-xs text-ink-muted"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      )}

      <BeforeAfterPanel doc={doc} />

      <div>
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Audit trail
        </div>
        <ActivityTimeline log={doc.activity_log} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { documents, loading, error } = useDocuments();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.file_name === selectedFile) ?? null;

  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-ink">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">NoCap Audit Dashboard</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Live status of every document processed by Inspector, Repair, and Verifier.
            </p>
          </div>
          <NotificationBell />
        </header>

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && !error && (
          <p className="text-sm text-ink-muted">Loading audit data…</p>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="rounded-lg border border-ink-muted/20 px-4 py-6 text-center text-sm text-ink-muted">
            No documents logged yet. Run any agent with{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">--log</code> to see
            it appear here.
          </div>
        )}

        {!loading && documents.length > 0 && (
          <>
            <BatchHealth documents={documents} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <button
                    key={doc.file_name}
                    onClick={() => setSelectedFile(doc.file_name)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedFile === doc.file_name
                        ? "border-accent-lime/40 bg-accent-lime/5"
                        : "border-ink-muted/15 hover:border-ink-muted/30"
                    }`}
                  >
                    <span className="truncate text-ink">{doc.file_name}</span>
                    <StatusPill status={doc.current_status} />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-ink-muted/15 p-6">
                {selectedDoc ? (
                  <DocumentDetail doc={selectedDoc} />
                ) : (
                  <p className="text-sm text-ink-muted">
                    Select a document on the left to see its full audit trail.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}