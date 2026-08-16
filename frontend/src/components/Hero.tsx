"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronDown, ShieldCheck } from "lucide-react";

export function Hero({ connected }: { connected: boolean }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-kicker", { opacity: 0, y: 12, duration: 0.5 })
        .from(".hero-title-line", { opacity: 0, y: 40, duration: 0.7, stagger: 0.12 }, "-=0.25")
        .from(".hero-sub", { opacity: 0, y: 16, duration: 0.5 }, "-=0.3")
        .from(".hero-badge", { opacity: 0, y: 12, duration: 0.4, stagger: 0.08 }, "-=0.2")
        .from(".hero-scroll-cue", { opacity: 0, duration: 0.6 }, "-=0.1");

      gsap.to(".hero-blob-a", {
        x: 40,
        y: -20,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".hero-blob-b", {
        x: -30,
        y: 30,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 grain-bg"
    >
      <div
        className="hero-blob-a pointer-events-none absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full opacity-40 blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--color-brand-pink), transparent 70%)" }}
      />
      <div
        className="hero-blob-b pointer-events-none absolute -right-24 bottom-1/4 h-[460px] w-[460px] rounded-full opacity-30 blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--color-brand-orange), transparent 70%)" }}
      />

      <div className="hero-kicker relative z-10 mb-6 flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-ink-muted backdrop-blur">
        <span
          className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-status-good" : "bg-ink-faint"}`}
          style={{ boxShadow: connected ? "0 0 8px var(--color-status-good)" : "none" }}
        />
        {connected ? "Live — connected to audit log" : "Connecting..."}
      </div>

      <h1 className="relative z-10 text-center font-display text-6xl font-medium leading-[0.95] sm:text-7xl md:text-8xl">
        <span className="hero-title-line block">No</span>
        <span className="hero-title-line text-gradient-brand block italic">Cap</span>
      </h1>

      <p className="hero-sub relative z-10 mt-8 max-w-xl text-center text-lg text-ink-muted">
        No chatbot lies. An autonomous agent that catches, quarantines, and repairs bad data
        in your AI knowledge base before it ever reaches an answer.
      </p>

      <div className="hero-badge relative z-10 mt-10 flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 font-mono text-xs text-ink-muted">
        <ShieldCheck size={14} className="text-brand-pink" />
        Taskmaster track — All Things Agentic Hackathon
      </div>

      <div className="hero-scroll-cue absolute bottom-10 flex flex-col items-center gap-2 text-ink-faint">
        <span className="font-mono text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown size={16} className="animate-bounce" />
      </div>
    </section>
  );
}
