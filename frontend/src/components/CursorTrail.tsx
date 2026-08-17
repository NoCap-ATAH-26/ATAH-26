"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** A small dot plus a soft trailing glow that follows the cursor across the
 * whole app. Skipped for touch input (no real cursor) and reduced-motion
 * preferences, since the lag itself is decorative rather than input echo. */
export function CursorTrail() {
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const glow = glowRef.current;
    if (coarse || reduced || !dot || !glow) return;

    gsap.set([dot, glow], { xPercent: -50, yPercent: -50 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3.out" });
    const glowX = gsap.quickTo(glow, "x", { duration: 0.6, ease: "power3.out" });
    const glowY = gsap.quickTo(glow, "y", { duration: 0.6, ease: "power3.out" });

    function handleMove(e: MouseEvent) {
      dotX(e.clientX);
      dotY(e.clientY);
      glowX(e.clientX);
      glowY(e.clientY);
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-[380px] w-[380px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-accent-lime), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-accent-lime"
        style={{ boxShadow: "0 0 12px 2px var(--color-accent-lime)" }}
        aria-hidden="true"
      />
    </>
  );
}
