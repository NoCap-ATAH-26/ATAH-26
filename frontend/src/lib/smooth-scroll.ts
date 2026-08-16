"use client";

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;

/** Drives scroll through Lenis instead of the native scrollbar and keeps GSAP's
 * ticker/ScrollTrigger in sync with it, so ScrollTrigger-based animations
 * (Hero, PipelineStrip, ScoreChart, StatTiles) track the smoothed position. */
export function initSmoothScroll() {
  if (lenis || typeof window === "undefined") return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}
