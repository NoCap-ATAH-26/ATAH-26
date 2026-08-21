"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Application } from "@splinetool/runtime";

// The Spline runtime touches `window` and pulls in a large WASM/WebGL bundle,
// so it's loaded client-side only and kept out of the initial page JS.
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

const SCENE_URL = "https://prod.spline.design/qcICZX7w7KfztpZr/scene.splinecode";

/**
 * The character, framed on the right side of the page.
 *
 * Framing goes through the Spline runtime's own `app.setZoom()` — a thin
 * wrapper over the scene camera's `zoom` (source: node_modules/@splinetool/
 * runtime/build/runtime.js, `setZoom(e,r){r>=0&&(...zoom=r)}`), where `1` is
 * the camera's authored default, values below `1` pull it back (more of the
 * character visible, smaller), and above `1` push in.
 *
 * This replaced an earlier version that tried to crop by making the canvas
 * taller than its container and clipping the overflow, on the assumption
 * that Spline re-fits its camera to the canvas's aspect ratio. That
 * assumption was never actually verified against a real screenshot and
 * turned out to be wrong — it left almost the entire character clipped out
 * of frame. `setZoom` operates on the real camera, so its effect is
 * predictable regardless of container size.
 *
 * `zoom` is a prop rather than a hardcoded value because the correct number
 * depends on how far back the character sits in the scene as authored,
 * which isn't knowable from here — tune it once you can see it rendered.
 * Default is `1`, i.e. no adjustment: the size as originally authored in
 * the scene, before either of the earlier zoom-out attempts.
 */
export function ChatSplineCharacter({ zoom = 1 }: { zoom?: number }) {
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
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] overflow-hidden">
      <div
        className="pointer-events-auto absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: loaded ? 1 : 0 }}
      >
        <Spline scene={SCENE_URL} onLoad={handleLoad} className="h-full w-full" />
      </div>
    </div>
  );
}
