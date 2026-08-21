"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Application } from "@splinetool/runtime";

// The Spline runtime touches `window` and pulls in a large WASM/WebGL bundle,
// so it's loaded client-side only and kept out of the initial page JS.
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

const SCENE_URL = "https://prod.spline.design/qcICZX7w7KfztpZr/scene.splinecode";

/**
 * The character, rendered full-bleed as the background layer for the whole
 * page — not confined to a narrow side column. The chat box in ChatRoom
 * floats on top of it as a separate layer, which is also the point: the
 * glass panel is meant to show a blurred hint of the character/scene
 * through it, and that only reads as "blurred" if there's actually
 * something behind the panel to blur. A narrow side column meant nothing
 * but flat black sat behind the chat box, so its backdrop-blur had nothing
 * to do and just looked like a grey tint. It just stops constraining the
 * character to a box narrower than it actually needs, which was clipping
 * it — at full width the scene's own camera actually centers it, not the
 * right-bias an earlier version of this comment assumed (that was an
 * artifact of the narrow column, not the scene itself).
 *
 * Zoom is a CSS `scale()` on the canvas itself, not the Spline runtime's own
 * `app.setZoom()`. That looked like the right tool — `setZoom(t)` in
 * node_modules/@splinetool/runtime/build/runtime.js reads
 * `this._controls?.orbitControls instanceof wp && ...setZoom(t)` — but it's
 * a silent no-op unless the scene's camera has interactive OrbitControls
 * attached, which this scene doesn't, so it never had any effect at any
 * value. `origin-top` keeps the top of the frame anchored while scaling, so
 * increasing zoom crops in from the bottom rather than growing from center
 * (which would push the head out of frame just as fast as it crops the
 * bottom in). `zoom` is a prop rather than a hardcoded value because the
 * right number depends on the scene as authored — tune it once you can see
 * it rendered.
 *
 * `shiftXPercent` moves it off that centered default — negative is left.
 * The parent needs overflow-hidden (set on <main> in ChatRoom) since
 * scaling/shifting a full-viewport-width element would otherwise create
 * scroll.
 */
export function ChatSplineCharacter({
  zoom = 1.6,
  shiftXPercent = 22,
}: {
  zoom?: number;
  shiftXPercent?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  function handleLoad(app: Application) {
    // The scene's own background may not be pure #000 (or may not be a flat
    // fill at all in the exported file), which would show as a visible box
    // around the character instead of it just sitting on the page. Forcing
    // it transparent lets <main>'s own bg-black show through everywhere the
    // scene itself doesn't draw something.
    app.setBackgroundColor("transparent");
    setLoaded(true);
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 origin-top transition-opacity duration-1000"
      style={{
        opacity: loaded ? 1 : 0,
        transform: `translateX(${shiftXPercent}%) scale(${zoom})`,
      }}
    >
      <Spline scene={SCENE_URL} onLoad={handleLoad} className="h-full w-full" />
    </div>
  );
}
