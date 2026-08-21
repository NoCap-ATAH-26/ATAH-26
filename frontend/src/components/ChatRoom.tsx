"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { ChatSplineCharacter } from "./ChatSplineCharacter";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Load this user's own history (RLS on chat_messages scopes it) and replay
  // it ahead of the static opening line.
  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .order("created_at", { ascending: true })
        .limit(200);

      if (!active || !data || data.length === 0) return;
      setMessages([
        ...OPENING,
        ...data.map((row) => ({
          id: row.id,
          role: row.role === "assistant" ? ("agent" as const) : ("user" as const),
          text: row.content,
        })),
      ]);
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [supabase]);

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
      let fullReply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullReply += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, text: m.text + chunk } : m))
        );
      }

      // Best-effort — a failed save shouldn't interrupt an otherwise-working
      // chat, so this isn't awaited or surfaced to the user.
      void supabase.from("chat_messages").insert([
        { role: "user", content: text },
        { role: "assistant", content: fullReply },
      ]);
    } catch {
      fail("Lost connection to the chat service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    // grain-bg (globals.css): a faint noise texture behind everything. Without
    // it the glass box below has nothing but flat black behind it, and
    // backdrop-blur of a flat color is visually a no-op — the box read as a
    // plain grey fill rather than "blurred", because there was nothing there
    // to actually blur.
    // overflow-hidden: ChatSplineCharacter shifts left with a CSS translate on
    // a full-viewport-width element, which would otherwise push the page's
    // right edge out and create horizontal scroll.
    <main className="relative min-h-screen overflow-hidden grain-bg bg-black text-zinc-100">
      <ChatSplineCharacter />

      {/* pointer-events-none here, not on <main> — this wrapper's own box
          covers the full page even though its visible content (the header
          row, the floating chat card) covers less than that. Without this,
          its transparent space would still hit-test as clickable and eat
          every mouse event meant for the Spline layer underneath — which is
          why the character wasn't tracking the cursor. pointer-events is
          inherited, so it has to be explicitly turned back on for the
          header's Link and for the chat card below. */}
      <div className="relative z-10 flex min-h-screen flex-col pointer-events-none">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-300 transition hover:bg-white/5"
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

        {/* Back to the original width (54% on large screens, full width
            below that) — the max-w-md floating-card version read as too
            small. */}
        <div className="pointer-events-auto flex flex-1 flex-col px-6 py-8 sm:px-10 lg:w-[54%]">
          {/* Kept the white tint very faint on purpose — a flat opaque fill
              would hide the character behind it entirely, and the earlier
              /5 still read as a plain grey panel rather than "glass".
              backdrop-blur-sm (down from -md) per feedback that -md was too
              much blur. */}
          <div className="flex w-full flex-1 flex-col overflow-hidden rounded-3xl border border-white/25 bg-white/[0.03] backdrop-blur-sm">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
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

            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-white/10 p-4"
            >
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
      </div>
    </main>
  );
}
