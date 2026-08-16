"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Globe } from "lucide-react";
import { useLiveClock } from "@/hooks/useLiveClock";
import { useMousePosition } from "@/hooks/useMousePosition";
import { ScrambleText } from "./ScrambleText";
import { GlossyWordmark } from "./GlossyWordmark";

export function Hero({ connected }: { connected: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const { time, zone } = useLiveClock();
  const pos = useMousePosition(scope);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-kicker", { opacity: 0, y: 12, duration: 0.5 })
        .from(".hero-wordmark", { opacity: 0, scale: 0.92, duration: 0.9, ease: "power2.out" }, "-=0.2")
        .from(".hero-sub", { opacity: 0, y: 16, duration: 0.5 }, "-=0.3")
        .from(".hero-badge", { opacity: 0, y: 12, duration: 0.4, stagger: 0.08 }, "-=0.2")
        .from(".hero-scroll-cue", { opacity: 0, duration: 0.6 }, "-=0.1");
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col overflow-hidden px-6 py-6 sm:px-10"
    >
      <div className="hud-grid" />

      {/* Top HUD bar */}
      <div className="relative z-10 flex items-start justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
        <div>
          <div className="text-sm font-bold text-ink">NOCAP.DEV</div>
          <div className="mt-1 text-ink text-base normal-case tracking-normal">Truth Layer</div>
        </div>
        <div className="hidden text-center normal-case tracking-normal sm:block">
          Thinking in evidence.
          <br />
          Guarding what&apos;s true.
        </div>
        <div className="flex gap-6">
          <span>Work</span>
          <span>Contact</span>
          <span className={connected ? "text-accent-lime" : ""}>
            Status[{connected ? "●" : "○"}]
          </span>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div className="hero-kicker mb-4 flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-ink-muted backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-status-good" : "bg-ink-faint"}`}
            style={{ boxShadow: connected ? "0 0 8px var(--color-status-good)" : "none" }}
          />
          {connected ? "Live — connected to audit log" : "Connecting..."}
        </div>

        <div className="hero-wordmark w-full max-w-3xl">
          <GlossyWordmark />
        </div>

        <h1 className="mt-6 text-center font-display text-4xl font-medium leading-[1.05] sm:text-5xl md:text-6xl">
          <ScrambleText text="I BRING PROOF" as="span" className="block text-ink" />
          <span className="block">
            <span className="text-accent-lime italic">TO</span>{" "}
            <ScrambleText text="EVERY ANSWER" as="span" className="text-ink" delay={0.15} />
          </span>
        </h1>

        <p className="hero-sub mt-8 max-w-xl text-center text-lg text-ink-muted">
          No chatbot lies. An autonomous agent that catches, quarantines, and repairs bad data
          in your AI knowledge base before it ever reaches an answer.
        </p>

        <div className="hero-badge mt-10 flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 font-mono text-xs text-ink-muted">
          <span className="text-accent-lime">Taskmaster</span>
          track — All Things Agentic Hackathon
        </div>
      </div>

      {/* Bottom HUD bar */}
      <div className="relative z-10 flex items-center justify-between font-mono text-xs text-ink-faint">
        <span>
          {zone} {time}
        </span>
        <span className="hidden sm:inline">
          {String(pos.x).padStart(4, "0")} X {String(pos.y).padStart(4, "0")} Y
        </span>
        <Globe size={16} />
      </div>

      <div className="hero-scroll-cue absolute bottom-16 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-ink-faint md:flex">
        <span className="font-mono text-[10px] uppercase tracking-widest">Scroll</span>
      </div>
    </section>
  );
}
