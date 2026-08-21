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
 * Zoom goes through the Spline runtime's own `app.setZoom()` — a thin
 * wrapper over the scene camera's `zoom` (source: node_modules/@splinetool/
 * runtime/build/runtime.js, `setZoom(e,r){r>=0&&(...zoom=r)}`), where `1` is
 * the camera's authored default, values below `1` pull it back (more of the
 * character visible, smaller), and above `1` push in. `zoom` is a prop
 * rather than a hardcoded value because the correct number depends on the
 * scene as authored, which isn't knowable from here — tune it once you can
 * see it rendered.
 *
 * `shiftXPercent` moves it off that centered default — negative is left.
 * Done as a CSS translate on the canvas itself (not a Spline camera/object
 * call) since it's a pure screen-space nudge, not something about the 3D
 * scene. The parent needs overflow-hidden (set on <main> in ChatRoom) since
 * shifting a full-viewport-width element sideways would otherwise create
 * horizontal scroll.
 */
export function ChatSplineCharacter({
  zoom = 1.3,
  shiftXPercent = 22,
}: {
  zoom?: number;
  shiftXPercent?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  function handleLoad(app: Application) {
    app.setZoom(zoom);
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
      className="pointer-events-auto absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: loaded ? 1 : 0, transform: `translateX(${shiftXPercent}%)` }}
    >
      <Spline scene={SCENE_URL} onLoad={handleLoad} className="h-full w-full" />
    </div>
  );
}
