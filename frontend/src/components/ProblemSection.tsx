"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Skull, RefreshCw, MessageSquareWarning } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const POINTS = [
  {
    icon: RefreshCw,
    title: "Model collapse, one doc at a time",
    body: "AI-generated content keeps feeding back into the same knowledge base. Each generation compounds the last, quietly degrading factual grounding.",
  },
  {
    icon: MessageSquareWarning,
    title: "Chatbots cite what they're given",
    body: "A RAG system is only as honest as its index. Once a synthetic, unsourced, or stale claim gets in, every answer built on it inherits the lie.",
  },
  {
    icon: Skull,
    title: "Nobody's watching the ingest pipe",
    body: "New docs land in the knowledge base every day. Without a gate, provenance and freshness checks never happen until a customer catches the mistake.",
  },
];

export function ProblemSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".problem-heading", {
        opacity: 0,
        y: 20,
        filter: "blur(16px)",
        duration: 0.7,
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
      gsap.from(".problem-card", {
        opacity: 0,
        y: 24,
        filter: "blur(12px)",
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: { trigger: scope.current, start: "top 75%" },
      });
    },
    { scope }
  );

  return (
    <section ref={scope} className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="problem-heading mb-12 max-w-2xl">
        <div className="hud-label uppercase">The problem</div>
        <h2 className="mt-3 font-display text-3xl italic sm:text-4xl">
          Your knowledge base is trusting documents it never checked.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="problem-card card-surface p-6">
            <p.icon size={20} className="text-accent-lime" />
            <h3 className="mt-4 text-base font-medium text-ink">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
