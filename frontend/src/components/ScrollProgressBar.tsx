"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/** Fixed vertical scroll-position indicator on the right edge: a pill track
 * with a smaller pill thumb that travels along it as the page scrolls.
 * Fades in while scrolling, fades back out once scrolling stops. */
export function ScrollProgressBar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const setY = gsap.quickTo(thumb, "y", { duration: 0.3, ease: "power2.out" });

    function update() {
      const travel = track!.clientHeight - thumb!.clientHeight;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      setY(Math.max(0, Math.min(travel, progress * travel)));

      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 900);
    }

    update();
    setVisible(false);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className={`pointer-events-none fixed right-4 top-1/2 z-50 hidden h-[32vh] w-1 -translate-y-1/2 rounded-full bg-surface-2/80 transition-opacity duration-500 sm:block ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <div ref={thumbRef} className="absolute left-0 top-0 h-9 w-1 rounded-full bg-ink" />
    </div>
  );
}
