"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrambleTextPlugin);

export function ScrambleText({
  text,
  as: Tag = "span",
  className,
  delay = 0,
  chars = "upperCase",
}: {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  chars?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      duration: 1.1,
      scrambleText: { text, chars, revealDelay: 0.1, speed: 0.4 },
      delay,
      ease: "none",
    });
  }, [text, delay]);

  return (
    // @ts-expect-error — dynamic tag ref typing
    <Tag ref={ref} className={className}>
      {text}
    </Tag>
  );
}
