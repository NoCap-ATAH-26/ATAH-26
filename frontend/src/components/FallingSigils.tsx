"use client";

import { useRef, type ComponentType } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ShieldCheck,
  FileCheck2,
  ScanSearch,
  BadgeCheck,
  Fingerprint,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import { Sigil } from "./Sigil";

type Item =
  | { kind: "icon"; Icon: ComponentType<{ size?: number; className?: string }>; left: string; size: number; duration: number; delay: number; dir: 1 | -1 }
  | { kind: "sigil"; glyph: "cross" | "triangle" | "chevrons" | "diamond"; left: string; size: number; duration: number; delay: number; dir: 1 | -1 };

const ITEMS: Item[] = [
  { kind: "icon", Icon: ShieldCheck, left: "6%", size: 20, duration: 16, delay: 0, dir: 1 },
  { kind: "sigil", glyph: "cross", left: "16%", size: 22, duration: 24, delay: 5, dir: 1 },
  { kind: "icon", Icon: FileCheck2, left: "27%", size: 16, duration: 21, delay: 9, dir: -1 },
  { kind: "sigil", glyph: "triangle", left: "38%", size: 20, duration: 19, delay: 2, dir: -1 },
  { kind: "icon", Icon: ScanSearch, left: "48%", size: 16, duration: 26, delay: 12, dir: 1 },
  { kind: "sigil", glyph: "chevrons", left: "58%", size: 22, duration: 18, delay: 4, dir: -1 },
  { kind: "icon", Icon: BadgeCheck, left: "68%", size: 18, duration: 22, delay: 7, dir: 1 },
  { kind: "sigil", glyph: "diamond", left: "77%", size: 18, duration: 17, delay: 1, dir: -1 },
  { kind: "icon", Icon: Fingerprint, left: "85%", size: 18, duration: 25, delay: 14, dir: 1 },
  { kind: "icon", Icon: Sparkles, left: "93%", size: 15, duration: 20, delay: 10, dir: -1 },
  { kind: "sigil", glyph: "cross", left: "11%", size: 15, duration: 23, delay: 16, dir: -1 },
  { kind: "icon", Icon: CircleCheck, left: "73%", size: 17, duration: 27, delay: 6, dir: 1 },
];

/**
 * Icons and abstract "sigil" glyphs drifting down from above the hero on an
 * endless loop — a reinterpretation of the falling decoration seen in the
 * haoqi.design reference, with our own trust/verification iconography.
 */
export function FallingSigils() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const nodes = gsap.utils.toArray<HTMLElement>(".sigil-item");
      const vh = window.innerHeight;

      nodes.forEach((el, i) => {
        const item = ITEMS[i];
        gsap.set(el, { y: ((i * 83) % (vh + 160)) - 80 });

        gsap.to(el, {
          y: `+=${vh + 240}`,
          duration: item.duration,
          delay: item.delay,
          repeat: -1,
          ease: "none",
          modifiers: { y: gsap.utils.wrap(-80, vh + 80) },
        });

        gsap.to(el, {
          x: `+=${16 * item.dir}`,
          duration: 3 + (i % 4),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(el, {
          rotation: 360 * item.dir,
          duration: 22 + (i % 5) * 4,
          repeat: -1,
          ease: "none",
        });
      });
    },
    { scope }
  );

  return (
    <div ref={scope} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {ITEMS.map((item, i) => (
        <div
          key={i}
          className="sigil-item absolute top-0 text-accent-lime/60"
          style={{ left: item.left }}
        >
          {item.kind === "icon" ? <item.Icon size={item.size} /> : <Sigil kind={item.glyph} size={item.size} />}
        </div>
      ))}
    </div>
  );
}
