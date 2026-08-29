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
import { TunnelExperience, type TunnelPanelConfig } from "@/components/TunnelExperience";
import { Footer } from "@/components/Footer";
import SmokeyCursor from "@/components/ui/smokey-cursor";

const TUNNEL_PANELS: TunnelPanelConfig[] = [
  { node: <ProblemSection />, anchor: { x: -0.6, y: 0.15, z: -10 }, treatment: "emerge", maxWidth: 1152 },
  { node: <HowItWorks />, anchor: { x: 0.5, y: -0.1, z: -19 }, treatment: "embed", maxWidth: 1152 },
  { node: <FeaturesGrid />, anchor: { x: -0.4, y: 0.1, z: -28 }, treatment: "reveal", maxWidth: 1152 },
];

export default function Home() {
  useEffect(() => {
    initReducedMotion();
    initSmoothScroll();
  }, []);

  return (
    <main className="relative z-10 flex-1">
      <SmokeyCursor color="#E7DADA" />
      <Hero />
      <SectionBlend />
      <TunnelExperience panels={TUNNEL_PANELS} />
      <SectionBlend />
      <CTASection />
      <Footer />
    </main>
  );
}
