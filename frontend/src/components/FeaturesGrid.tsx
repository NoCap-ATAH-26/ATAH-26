"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, GitBranch, ScrollText, Radio } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Autonomous triage",
    body: "Approve, quarantine, or repair — decided automatically against your scoring thresholds, no manual review queue.",
  },
  {
    icon: GitBranch,
    title: "Source-backed repair",
    body: "Rewrites are verified against your approved sources before publishing, never invented from nothing.",
  },
  {
    icon: ScrollText,
    title: "Full audit trail",
    body: "Every inspection, repair, and verification is logged with reasons, changes made, and remaining issues.",
  },
  {
    icon: Radio,
    title: "Live dashboard",
    body: "Watch documents move through the pipeline in real time, backed by a Postgres audit log over Supabase Realtime.",
  },
];

export function FeaturesGrid() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".features-heading", {
        opacity: 0,
        y: 20,
        filter: "blur(16px)",
        duration: 0.7,
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
      gsap.from(".feature-card", {
        opacity: 0,
        y: 24,
        scale: 0.97,
        filter: "blur(12px)",
        duration: 0.6,
        stagger: 0.08,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: scope.current, start: "top 75%" },
      });
    },
    { scope }
  );

  return (
    <section id="features" ref={scope} className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="features-heading mb-12 max-w-2xl">
        <div className="hud-label uppercase">Features</div>
        <h2 className="mt-3 font-display text-3xl italic sm:text-4xl">
          Built to guard, not just flag.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card card-surface flex gap-4 p-6">
            <f.icon size={22} className="mt-1 shrink-0 text-accent-lime" />
            <div>
              <h3 className="text-base font-medium text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
