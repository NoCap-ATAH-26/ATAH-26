"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScanSearch, Wrench, BadgeCheck, ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    icon: ScanSearch,
    title: "Inspector",
    body: "Extracts claims and sources, then scores provenance, factual support, duplication, freshness, and synthetic-content risk.",
  },
  {
    icon: Wrench,
    title: "Repair",
    body: "For anything below the bar, drafts a corrected, source-backed replacement instead of just flagging it and walking away.",
  },
  {
    icon: BadgeCheck,
    title: "Verifier",
    body: "Checks the repaired draft against your approved sources, then autonomously approves, quarantines, or publishes with a full audit log.",
  },
];

export function HowItWorks() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".how-heading", {
        opacity: 0,
        y: 20,
        filter: "blur(16px)",
        duration: 0.7,
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
      gsap.from(".how-step", {
        opacity: 0,
        y: 24,
        filter: "blur(12px)",
        duration: 0.6,
        stagger: 0.15,
        scrollTrigger: { trigger: scope.current, start: "top 70%" },
      });
    },
    { scope }
  );

  return (
    <section id="how-it-works" ref={scope} className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="how-heading mb-12 max-w-2xl">
        <div className="hud-label uppercase">How it works</div>
        <h2 className="mt-3 font-display text-3xl italic sm:text-4xl">
          Event-driven, no human in the loop.
        </h2>
        <p className="mt-4 text-ink-muted">
          A new document lands, Pub/Sub routes it through three stages automatically. Every
          decision is logged, so every approval, repair, and quarantine is explainable.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        {STEPS.map((s, i) => (
          <div key={s.title} className="how-step flex flex-1 items-stretch gap-4">
            <div className="card-surface flex-1 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                  <s.icon size={18} className="text-accent-lime" />
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-ink-faint">
                  Stage {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="hidden items-center text-ink-faint md:flex">
                <ArrowRight size={20} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
