"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createTunnelScene, type Anchor } from "@/lib/tunnel/scene";
import { useTheme } from "@/hooks/useTheme";

gsap.registerPlugin(ScrollTrigger);

export type TunnelTreatment = "emerge" | "embed" | "reveal";

export type TunnelPanelConfig = {
  node: ReactNode;
  anchor: Anchor;
  treatment: TunnelTreatment;
  maxWidth: number;
};

// How strongly each treatment reacts to depth — emerge peels flat off the
// wall as it nears you (about section), embed pops out like it's mounted
// flush to the wall and pressurized toward the viewer (stat cards), reveal
// fans in with an extra tilt (feature grid).
const TREATMENTS: Record<TunnelTreatment, { curve: number; pop: number; tiltX: number }> = {
  emerge: { curve: 1, pop: 1, tiltX: 0 },
  embed: { curve: 0.4, pop: 1.35, tiltX: 0 },
  reveal: { curve: 0.75, pop: 1.1, tiltX: 6 },
};

// Distance-based opacity: fully transparent right up against the camera
// (about to pass behind you) and out in the fog, full bright in a band
// around the ideal reading distance, with a slow fade on the far edge so
// panels feel like they drift up out of the dark rather than switching on.
function falloff(distance: number, ideal: number) {
  const near = 1.8;
  const rise = gsap.utils.clamp(0, 1, (distance - near) / (ideal - near));
  const farEdge = ideal + 11;
  const fall = gsap.utils.clamp(0, 1, (farEdge - distance) / (farEdge - ideal));
  return Math.min(rise, fall);
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export function TunnelExperience({ panels }: { panels: TunnelPanelConfig[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const theme = useTheme();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const canvas = canvasRef.current;
      const root = rootRef.current;
      if (!canvas || !root) return;

      const scene = createTunnelScene(canvas, theme);
      const resize = () => scene.resize(window.innerWidth, window.innerHeight);
      resize();
      window.addEventListener("resize", resize);

      const targetProgress = { value: 0 };
      const renderedProgress = { value: 0 };
      let raf = 0;
      let running = false;
      const start = performance.now();

      const frame = () => {
        renderedProgress.value += (targetProgress.value - renderedProgress.value) * 0.08;
        const elapsed = (performance.now() - start) / 1000;
        scene.update(renderedProgress.value, elapsed);

        if (veilRef.current) {
          veilRef.current.style.opacity = String(
            1 - gsap.utils.clamp(0, 1, renderedProgress.value / 0.1)
          );
        }

        panels.forEach((panel, i) => {
          const el = panelRefs.current[i];
          if (!el) return;
          const p = scene.project(panel.anchor);
          const tone = TREATMENTS[panel.treatment];
          const opacity = falloff(p.distance, scene.IDEAL_DISTANCE);

          if (!p.visible || opacity <= 0.01) {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          } else {
            el.style.opacity = String(opacity);
            el.style.pointerEvents = "auto";
            const scale = 1 + (p.scale - 1) * tone.pop;
            el.style.transform =
              `translate3d(${p.x}px, ${p.y}px, 0) ` +
              `translate3d(-50%, -50%, 0) ` +
              `scale(${scale}) ` +
              `rotateY(${p.curveAngle * tone.curve}deg) ` +
              `rotateX(${tone.tiltX * (1 - opacity)}deg)`;
          }
        });

        if (running) raf = requestAnimationFrame(frame);
      };

      const startLoop = () => {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(frame);
      };
      const stopLoop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "+=350%",
        pin: true,
        pinSpacing: true,
        scrub: 0.4,
        onUpdate: (self) => {
          targetProgress.value = self.progress;
        },
        onEnter: startLoop,
        onEnterBack: startLoop,
        onLeave: stopLoop,
        onLeaveBack: stopLoop,
        onToggle: (self) => {
          gsap.to(canvas, { opacity: self.isActive ? 0.85 : 0, duration: 0.6, ease: "power2.out" });
        },
      });

      return () => {
        stopLoop();
        window.removeEventListener("resize", resize);
        scene.dispose();
      };
    },
    // `theme` rebuilds the scene: the materials, fog, and wall texture all bake
    // their colors in at construction, so there's nothing to mutate in place.
    // useGSAP's cleanup disposes the old scene and reverts its ScrollTrigger.
    { scope: rootRef, dependencies: [panels, reducedMotion, theme] }
  );

  if (reducedMotion) {
    return (
      <div className="flex flex-col">
        {panels.map((panel, i) => (
          <div key={i}>{panel.node}</div>
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="tunnel-root">
      <canvas ref={canvasRef} className="tunnel-canvas" aria-hidden />
      <div ref={veilRef} className="tunnel-veil" aria-hidden />
      {panels.map((panel, i) => (
        <div
          key={i}
          ref={(el) => {
            panelRefs.current[i] = el;
          }}
          className="tunnel-panel"
          style={{ maxWidth: panel.maxWidth }}
        >
          {panel.node}
        </div>
      ))}
    </div>
  );
}
