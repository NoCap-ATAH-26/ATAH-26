"use client";

import { MessageSquare, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

export type ChatSession = { id: number; title: string; updated_at: string };

/**
 * Collapsed state renders just the toggle button so it costs almost no width
 * next to the character — the whole point of "closeable" is to give that
 * space back, not to leave an empty rail sitting there.
 */
export function ChatSessionsPanel({
  sessions,
  activeSessionId,
  open,
  onToggle,
  onSelect,
  onNewChat,
}: {
  sessions: ChatSession[];
  activeSessionId: number | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: number) => void;
  onNewChat: () => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Open chat sessions"
        className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/[0.03] text-zinc-300 backdrop-blur-[6px] transition hover:bg-white/10"
      >
        <PanelLeftOpen size={16} />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex w-56 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/25 bg-white/[0.03] backdrop-blur-[6px]">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Sessions
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Close chat sessions"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-full border border-white/15 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
      >
        <Plus size={14} />
        New chat
      </button>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">No chats yet</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
              s.id === activeSessionId
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <MessageSquare size={13} className="shrink-0 opacity-60" />
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
