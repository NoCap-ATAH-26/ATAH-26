"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { ChatSplineCharacter } from "./ChatSplineCharacter";
import { ChatSessionsPanel, type ChatSession } from "./ChatSessionsPanel";
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  // Set right before setActiveSessionId() when send() itself just created the
  // session for the message it's about to persist — otherwise the
  // loadMessages effect below reacts to that id change by re-fetching from
  // the DB, and since the insert hasn't landed yet, it clobbers the
  // in-progress/just-finished reply with an empty list.
  const skipNextLoadRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Load this user's session list (RLS on chat_sessions scopes it to them)
  // and open the most recently active one, if any.
  useEffect(() => {
    let active = true;

    async function loadSessions() {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (!active || !data) return;
      setSessions(data);
      if (data.length > 0) setActiveSessionId(data[0].id);
    }

    loadSessions();
    return () => {
      active = false;
    };
  }, [supabase]);

  // Replays the active session's history ahead of the static opening line.
  // Also runs for activeSessionId === null (a session not yet created, e.g.
  // right after "New chat"), where it just resets back to the opening line.
  useEffect(() => {
    let active = true;

    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    async function loadMessages() {
      if (activeSessionId === null) {
        setMessages(OPENING);
        return;
      }

      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("session_id", activeSessionId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!active) return;
      setMessages([
        ...OPENING,
        ...(data ?? []).map((row) => ({
          id: row.id,
          role: row.role === "assistant" ? ("agent" as const) : ("user" as const),
          text: row.content,
        })),
      ]);
    }

    loadMessages();
    return () => {
      active = false;
    };
  }, [supabase, activeSessionId]);

  // Deletes messages first — chat_messages.session_id has no ON DELETE
  // CASCADE from chat_sessions, so leaving them would orphan rows RLS still
  // scopes to this user but that no session would ever load again.
  async function deleteSession(id: number) {
    const { error: messagesError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("session_id", id);
    if (messagesError) {
      console.error("[chat] failed to delete messages for session:", messagesError);
      return;
    }

    const { error: sessionError } = await supabase.from("chat_sessions").delete().eq("id", id);
    if (sessionError) {
      console.error("[chat] failed to delete session:", sessionError);
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  }

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
      // Lazily create the session on the first message of a "New chat" —
      // no empty session rows for chats that never got typed into.
      let sessionId = activeSessionId;
      if (sessionId === null) {
        const { data: session, error: sessionError } = await supabase
          .from("chat_sessions")
          .insert({ title: text.slice(0, 60) })
          .select("id, title, updated_at")
          .single();

        if (sessionError || !session) {
          fail("Could not start a new chat session.");
          return;
        }
        sessionId = session.id;
        skipNextLoadRef.current = true;
        setActiveSessionId(sessionId);
        setSessions((prev) => [session, ...prev]);
      }

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

      // Awaited (not fire-and-forget) specifically so a real failure here is
      // visible in the console instead of silently vanishing — a save that
      // fails with zero trace is worse than one that costs a bit of latency.
      const { error: saveError } = await supabase.from("chat_messages").insert([
        { session_id: sessionId, role: "user", content: text },
        { session_id: sessionId, role: "assistant", content: fullReply },
      ]);
      if (saveError) {
        console.error("[chat] failed to save messages:", saveError);
      }

      // Bumps the session to the top of the sidebar, matching updated_at
      // ordering.
      const now = new Date().toISOString();
      const { error: bumpError } = await supabase
        .from("chat_sessions")
        .update({ updated_at: now })
        .eq("id", sessionId);
      if (bumpError) {
        console.error("[chat] failed to bump session updated_at:", bumpError);
      }
      setSessions((prev) =>
        [...prev]
          .map((s) => (s.id === sessionId ? { ...s, updated_at: now } : s))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      );
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
    //
    // h-screen (not min-h-screen) on this and the wrapper below: min-h-screen
    // only sets a floor, so once the message list had enough bubbles to want
    // more room than the viewport, these containers just grew past it and the
    // whole page scrolled instead of the message list scrolling internally.
    // h-screen caps them at the viewport so overflow has to go somewhere —
    // see the min-h-0 note below for where.
    <main className="relative h-screen overflow-hidden grain-bg bg-black text-zinc-100">
      <ChatSplineCharacter />

      {/* pointer-events-none here, not on <main> — this wrapper's own box
          covers the full page even though its visible content (the header
          row, the floating chat card) covers less than that. Without this,
          its transparent space would still hit-test as clickable and eat
          every mouse event meant for the Spline layer underneath — which is
          why the character wasn't tracking the cursor. pointer-events is
          inherited, so it has to be explicitly turned back on for the
          header's Link and for the chat card below. */}
      <div className="relative z-10 flex h-screen flex-col pointer-events-none">
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
            small.
            min-h-0: a flex item's automatic minimum height is its content
            size, not 0, unless something overrides that — so without this,
            this div (and the card + message list inside it) would refuse to
            shrink to fit the h-screen budget above and grow the page instead,
            same failure mode min-h-0 fixes here as h-screen fixes above. */}
        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col px-6 py-8 sm:px-10 lg:w-[54%]">
          {/* Sessions panel + chat card share this row, still inside the
              same 54%-width region as before — collapsing the panel gives
              that width straight back to the card instead of changing how
              much of the page this whole block claims. */}
          <div className="flex min-h-0 flex-1 gap-4">
            <ChatSessionsPanel
              sessions={sessions}
              activeSessionId={activeSessionId}
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((v) => !v)}
              onSelect={setActiveSessionId}
              onNewChat={() => setActiveSessionId(null)}
              onDelete={deleteSession}
            />

            {/* Kept the white tint very faint on purpose — a flat opaque fill
                would hide the character behind it entirely, and the earlier
                /5 still read as a plain grey panel rather than "glass".
                backdrop-blur-sm (down from -md) was still slightly too much;
                backdrop-blur-[6px] (Tailwind's -sm is 8px) trims it further
                without going all the way down to -xs (4px). */}
            <div className="flex w-full flex-1 flex-col overflow-hidden rounded-3xl border border-white/25 bg-white/[0.03] backdrop-blur-[6px]">
              <div className="chat-scroll flex-1 space-y-4 overflow-y-auto p-6">
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
      </div>
    </main>
  );
}
