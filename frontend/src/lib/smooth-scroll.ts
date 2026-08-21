"use client";

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;

/** Drives scroll through Lenis instead of the native scrollbar and keeps GSAP's
 * ticker/ScrollTrigger in sync with it, so ScrollTrigger-based animations
 * (Hero, PipelineStrip, ScoreChart, StatTiles) track the smoothed position.
 *
 * Called from both the homepage and the dashboard, and Lenis is a
 * module-level singleton (one scroll driver for the whole client-side app,
 * not per-page) — so on the second+ call, this used to just return early and
 * leave Lenis holding the FIRST page's content height. Client-side
 * navigation to a page with different content height then looked like
 * scrolling was capped partway down, because Lenis's own bounds were still
 * the old page's. Resizing + refreshing ScrollTrigger on every call (not
 * just the first) fixes that without needing a full destroy/recreate. */
export function initSmoothScroll() {
  if (typeof window === "undefined") return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  if (lenis) {
    lenis.resize();
    ScrollTrigger.refresh();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}
