"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/** One interlocking chain-link pair, drawn as two offset stroked ellipses. */
function ChainLink({ color }: { color: string }) {
  return (
    <svg width="72" height="36" viewBox="0 0 72 36" className="shrink-0" aria-hidden="true">
      <ellipse
        cx="24"
        cy="18"
        rx="18"
        ry="12"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
      />
      <ellipse
        cx="48"
        cy="18"
        rx="18"
        ry="12"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        transform="rotate(90 48 18)"
      />
    </svg>
  );
}

function ChainStrip({
  color,
  count = 14,
  className,
}: {
  color: string;
  count?: number;
  className?: string;
}) {
  const links = Array.from({ length: count });
  // Render the strip twice back-to-back so an xPercent:-50 loop is seamless.
  return (
    <div className={`flex w-max items-center ${className ?? ""}`}>
      {[0, 1].map((rep) => (
        <div key={rep} className="flex items-center" aria-hidden={rep === 1}>
          {links.map((_, i) => (
            <ChainLink key={i} color={color} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChainBackground() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(".chain-strip-a", { xPercent: -50, duration: 34, repeat: -1, ease: "none" });
      gsap.to(".chain-strip-b", { xPercent: -50, duration: 46, repeat: -1, ease: "none" });
      gsap.to(".chain-strip-c", { xPercent: 50, duration: 60, repeat: -1, ease: "none" });
    },
    { scope }
  );

  return (
    <div
      ref={scope}
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]"
      aria-hidden="true"
    >
      <ChainStrip color="var(--color-brand-pink)" className="chain-strip-a absolute left-0 top-[18%] blur-[0.5px]" />
      <ChainStrip color="var(--color-brand-orange)" className="chain-strip-b absolute left-0 top-[52%]" />
      <ChainStrip color="var(--color-brand-red)" className="chain-strip-c absolute left-0 top-[82%] blur-[0.5px]" />
    </div>
  );
}
