"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { ChatSplineCharacter } from "./ChatSplineCharacter";

type Message = { id: number; role: "user" | "agent"; text: string; error?: boolean };

const OPENING: Message[] = [
  {
    id: 0,
    role: "agent",
    text: "Ask me anything about what the pipeline has seen — inspections, repairs, quarantines.",
  },
];

/**
 * This page opts out of the site's light/dark tokens on purpose: it's specced
 * as always-black so the Spline character reads against the same background it
 * was lit for. Colors here are literal rather than `--color-*` for that reason
 * — a themed token would turn this page pale in light mode.
 */
export function ChatRoom({ email }: { email: string | null }) {
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;

    const history = [...messages, { id: Date.now(), role: "user" as const, text }];
    setMessages(history);
    setDraft("");
    setBusy(true);

    // The reply streams in, so an empty bubble goes up front and is filled
    // token by token as the body arrives.
    const replyId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: replyId, role: "agent", text: "" }]);

    const fail = (msg: string) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, text: msg, error: true } : m))
      );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The opening line is UI scaffolding, not something the model said,
          // so it is not replayed as conversation history.
          messages: history
            .filter((m) => m.id !== 0 && !m.error)
            .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null);
        fail(detail?.error ?? `Request failed (${res.status}).`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, text: m.text + chunk } : m))
        );
      }
    } catch {
      fail("Lost connection to the chat service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-black text-zinc-100">
      <ChatSplineCharacter />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-300 transition hover:bg-white/5"
            >
              <ArrowLeft size={13} />
              Dashboard
            </Link>
            <span className="font-mono text-sm font-bold">CHAT</span>
          </div>
          {email && (
            <span className="hidden font-mono text-xs text-zinc-500 sm:inline">{email}</span>
          )}
        </header>

        {/* Held to the left half so the conversation never runs under the
            character occupying the right side of the viewport. */}
        <div className="flex flex-1 flex-col px-6 pb-8 sm:px-10 lg:w-[54%]">
          <div className="flex-1 space-y-4 overflow-y-auto py-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-zinc-100 text-black"
                      : m.error
                        ? "border border-red-500/40 bg-red-500/10 text-red-200"
                        : "border border-white/10 bg-white/[0.04] text-zinc-200"
                  }`}
                >
                  {m.text}
                  {/* Blinking caret while this bubble is still filling in. */}
                  {m.role === "agent" && busy && !m.text && (
                    <span className="inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={busy ? "Thinking..." : "Send a message"}
              aria-label="Message"
              disabled={busy}
              className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/35 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-black transition hover:bg-white disabled:opacity-40"
            >
              <SendHorizonal size={16} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
