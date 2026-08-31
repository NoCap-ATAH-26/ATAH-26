"use client";

import { useEffect } from "react";
import { initReducedMotion } from "@/lib/motion-setup";
import { initSmoothScroll } from "@/lib/smooth-scroll";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { CTASection } from "@/components/CTASection";
import { SectionBlend } from "@/components/SectionBlend";
import { TunnelExperience, type TunnelPanelConfig } from "@/components/TunnelExperience";
import { Footer } from "@/components/Footer";
import SmokeyCursor from "@/components/ui/smokey-cursor";

const TUNNEL_PANELS: TunnelPanelConfig[] = [
  { node: <ProblemSection />, anchor: { x: -0.6, y: 0.15, z: -10 }, treatment: "emerge", maxWidth: 1152 },
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
