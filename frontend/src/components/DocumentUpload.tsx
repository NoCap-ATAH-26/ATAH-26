"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FolderUp, Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlowCard } from "@/components/ui/spotlight-card";

const BUCKET = "incoming-uploads";
// Free-tier friendly ceiling — big enough for any real policy document,
// small enough that one accidental drop doesn't eat the Storage quota.
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type UploadItem = {
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

// webkitdirectory isn't in the standard HTMLInputElement types yet, but every
// major browser (Chrome, Edge, Firefox, Safari) supports it for folder picks.
type DirectoryInputProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & { webkitdirectory?: string; directory?: string };

export function DocumentUpload() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (list.length === 0) return;

    setItems((prev) => [
      ...prev,
      ...list.map((f) => ({ name: f.name, status: "uploading" as const })),
    ]);

    await Promise.all(
      list.map(async (file) => {
        if (file.size > MAX_FILE_BYTES) {
          setItems((prev) =>
            prev.map((it) =>
              it.name === file.name && it.status === "uploading"
                ? { ...it, status: "error", error: "Larger than 25MB" }
                : it
            )
          );
          return;
        }

        // Flat namespace matching incoming_docs/ — a folder pick's relative
        // path isn't preserved, just the file name itself.
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(file.name, file, { upsert: true });

        setItems((prev) =>
          prev.map((it) =>
            it.name === file.name && it.status === "uploading"
              ? error
                ? { ...it, status: "error", error: error.message }
                : { ...it, status: "done" }
              : it
          )
        );
      })
    );
  }

  return (
    <GlowCard customSize glowColor="mint" className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <UploadCloud size={14} className="text-accent-lime" />
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Add Documents
        </h3>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition ${
          dragOver ? "border-accent-lime bg-accent-lime/5" : "border-border"
        }`}
      >
        <p className="text-sm text-ink-muted">
          Drag files here, or pick files or an entire folder — any file type.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => filesInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:bg-border-strong"
          >
            <UploadCloud size={13} />
            Choose files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:bg-border-strong"
          >
            <FolderUp size={13} />
            Choose folder
          </button>
        </div>
        <input
          ref={filesInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
          {...({} as DirectoryInputProps)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {items.map((it, i) => (
            <li
              key={`${it.name}-${i}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
            >
              {it.status === "uploading" && (
                <Loader2 size={13} className="shrink-0 animate-spin text-ink-faint" />
              )}
              {it.status === "done" && (
                <CheckCircle2 size={13} className="shrink-0 text-accent-lime" />
              )}
              {it.status === "error" && (
                <AlertCircle
                  size={13}
                  className="shrink-0"
                  style={{ color: "var(--color-status-critical)" }}
                />
              )}
              <span className="truncate text-ink-muted">{it.name}</span>
              {it.status === "error" && (
                <span className="text-ink-faint">— {it.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-ink-faint">
        Uploaded files are picked up by the pipeline within a few seconds of the
        watcher&rsquo;s next poll.
      </p>
    </GlowCard>
  );
}
