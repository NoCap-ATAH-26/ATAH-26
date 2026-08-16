"use client";

import { useEffect } from "react";
import { initReducedMotion } from "@/lib/motion-setup";
import { initSmoothScroll } from "@/lib/smooth-scroll";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorks } from "@/components/HowItWorks";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { CTASection } from "@/components/CTASection";
import { SectionBlend } from "@/components/SectionBlend";
import { DrumTunnel } from "@/components/DrumTunnel";

export default function Home() {
  useEffect(() => {
    initReducedMotion();
    initSmoothScroll();
  }, []);

  return (
    <main className="flex-1">
      <Hero />
      <SectionBlend />
      <DrumTunnel>
        <ProblemSection />
        <SectionBlend />
        <HowItWorks />
        <SectionBlend />
        <FeaturesGrid />
      </DrumTunnel>
      <SectionBlend />
      <CTASection />

      <footer className="border-t border-border px-6 py-8 text-center font-mono text-[11px] text-ink-faint">
        NoCap — Taskmaster track, All Things Agentic Hackathon
      </footer>
    </main>
  );
}
