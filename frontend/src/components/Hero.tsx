"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ScrambleText } from "./ScrambleText";
import { GlossyWordmark } from "./GlossyWordmark";
import InteractiveNeuralVortex from "./ui/interactive-neural-vortex-background";
import { ThemeToggle } from "./ThemeToggle";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".hero-wordmark", { opacity: 0, scale: 0.92, duration: 0.9, ease: "power2.out" });

      // Sells the wordmark's 3D glass look — tumbles it around the vertical
      // and horizontal axes as you scroll through the hero, tied directly
      // to scroll position (scrub). The wordmark can be up to ~1024px wide
      // (max-w-5xl), so a perspective distance anywhere near that size
      // makes it balloon/distort instead of reading as a clean rotation —
      // it needs to be several times the element's own size to look right.
      gsap.set(".hero-wordmark", { transformPerspective: 2600, transformStyle: "preserve-3d" });
      gsap.to(".hero-wordmark", {
        rotateY: 90,
        rotateX: 8,
        ease: "none",
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: "+=180%",
          scrub: true,
        },
      });
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col overflow-hidden px-6 py-6 sm:px-10"
    >
      <InteractiveNeuralVortex />

      <div className="hero-wordmark absolute left-1/2 top-1/2 z-0 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2">
        <GlossyWordmark />
      </div>

      {/* Top HUD bar */}
      <div className="relative z-10 flex items-start justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
        <div>
          <div className="text-sm font-bold text-ink">Taskmaster</div>
          <div className="mt-1 text-ink text-base normal-case tracking-normal">
            track — All Things Agentic Hackathon
          </div>
        </div>
        <div className="hidden text-center normal-case tracking-normal sm:block">
          Thinking in evidence.
          <br />
          Guarding what&apos;s true.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/features">Features</Link>
          <Link
            href="/login"
            className="normal-case tracking-normal rounded-full border border-border-strong bg-surface px-3 py-1 text-ink transition hover:bg-surface-2"
          >
            Login
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Center content — pointer-events-none so its empty flex-1 area
          doesn't sit on top of the wordmark and eat the hover events that
          drive its cursor-smear effect; the h1 has no interactive children
          so it doesn't need pointer events of its own. */}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-end">
        <h1 className="self-start mb-10 max-w-4xl text-left font-sans text-3xl font-black uppercase leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
          <ScrambleText text="No chatbot lies." as="span" className="block" />
          <ScrambleText
            text="An autonomous agent that catches and fixes bad data before it becomes an answer."
            as="span"
            className="block"
            delay={0.15}
          />
        </h1>
      </div>
    </section>
  );
}
