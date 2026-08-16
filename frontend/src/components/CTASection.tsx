"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export function CTASection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(scope.current, {
        opacity: 0,
        y: 24,
        scale: 0.98,
        filter: "blur(16px)",
        duration: 0.7,
        scrollTrigger: { trigger: scope.current, start: "top 85%" },
      });
    },
    { scope }
  );

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
      <div
        ref={scope}
        className="glow-brand card-surface flex flex-col items-center gap-6 p-12 text-center"
      >
        <h2 className="font-display text-3xl italic sm:text-4xl">
          Guard your knowledge base before it lies to someone.
        </h2>
        <p className="max-w-lg text-ink-muted">
          Sign in to watch NoCap inspect, repair, and verify documents on your live audit log.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-accent-lime px-8 py-3 text-sm font-semibold text-bg transition hover:bg-accent-lime-dim"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}
