import gsap from "gsap";

let initialized = false;

/** Respect prefers-reduced-motion for GSAP too — CSS media queries alone don't
 * touch JS-driven tweens, so without this every GSAP animation still played
 * at full speed for users who've asked the OS to reduce motion. */
export function initReducedMotion() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = (reduced: boolean) => gsap.globalTimeline.timeScale(reduced ? 60 : 1);

  apply(query.matches);
  query.addEventListener("change", (e) => apply(e.matches));
}
