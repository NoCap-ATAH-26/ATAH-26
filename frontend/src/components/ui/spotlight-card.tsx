"use client";

import React, { useEffect, useRef, ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange" | "mint" | "mauve" | "gold";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and layout in favor of width/height or className
}

// Hue/spread tuned to this app's palette (globals.css --color-accent-*)
// rather than the component's original generic rainbow defaults — spread is
// kept narrow so the pointer-driven hue shift stays inside each brand color's
// family instead of sweeping the whole spectrum.
const glowColorMap = {
  blue: { base: 211, spread: 60 },
  purple: { base: 280, spread: 60 },
  green: { base: 120, spread: 50 },
  red: { base: 0, spread: 40 },
  orange: { base: 30, spread: 50 },
  mint: { base: 161, spread: 60 },
  mauve: { base: 309, spread: 60 },
  gold: { base: 42, spread: 50 },
};

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(function GlowCard(
  { children, className = "", glowColor = "blue", size = "md", width, height, customSize = false },
  forwardedRef
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Callers that need the card element itself as a GSAP ScrollTrigger
  // target (e.g. PipelineStrip, ScoreChart) pass a ref through here, while
  // the pointer-glow effect still needs its own internal ref to write the
  // --x/--y custom properties to.
  const setRefs = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;

      if (cardRef.current) {
        cardRef.current.style.setProperty("--x", x.toFixed(2));
        cardRef.current.style.setProperty("--xp", (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty("--y", y.toFixed(2));
        cardRef.current.style.setProperty("--yp", (y / window.innerHeight).toFixed(2));
      }
    };

    document.addEventListener("pointermove", syncPointer);
    return () => document.removeEventListener("pointermove", syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const getSizeClasses = () => {
    if (customSize) return "";
    return sizeMap[size];
  };

  const getInlineStyles = (): React.CSSProperties => {
    const baseStyles: Record<string, string | number> = {
      "--base": base,
      "--spread": spread,
      // Kept in sync with the rounded-[28px] class below — the pointer-glow
      // ::before/::after pseudo-elements (globals.css) mask themselves to
      // this same radius, so a mismatch here would show square glow corners
      // poking out past the card's actual rounded edge.
      "--radius": "28",
      "--border": "3",
      // Ink-based rather than a fixed neutral gray, so the backdrop and
      // border read correctly against both the true-black and light themes.
      // Bumped from 10% for a more visible frosted-glass tint.
      "--backdrop": "color-mix(in srgb, var(--color-ink) 14%, transparent)",
      "--backup-border": "var(--backdrop)",
      "--size": "200",
      "--outer": "1",
      "--border-size": "calc(var(--border, 2) * 1px)",
      "--spotlight-size": "calc(var(--size, 150) * 1px)",
      "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
      )`,
      backgroundColor: "var(--backdrop, transparent)",
      backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
      backgroundPosition: "50% 50%",
      backgroundAttachment: "fixed",
      border: "var(--border-size) solid var(--backup-border)",
      // Elevation + a faint glass-edge highlight. Set inline rather than as
      // a Tailwind shadow-[...] class: a comma-separated multi-layer value
      // inside one arbitrary bracket wasn't surviving Tailwind's arbitrary-
      // value parsing (computed box-shadow came out as all-zero).
      boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 0 rgba(255,255,255,0.08)",
      position: "relative",
      touchAction: "none",
    };

    if (width !== undefined) baseStyles.width = typeof width === "number" ? `${width}px` : width;
    if (height !== undefined) baseStyles.height = typeof height === "number" ? `${height}px` : height;

    return baseStyles as React.CSSProperties;
  };

  return (
    <div
      ref={setRefs}
      data-glow
      style={getInlineStyles()}
      className={`
        ${getSizeClasses()}
        ${!customSize ? "aspect-[3/4] grid grid-rows-[1fr_auto] p-4 gap-4" : ""}
        rounded-[28px]
        relative
        backdrop-blur-xl
        backdrop-saturate-150
        ${className}
      `}
    >
      <div ref={innerRef} data-glow></div>
      {children}
    </div>
  );
});

export { GlowCard };
