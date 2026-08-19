"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// The Spline runtime touches `window` and pulls in a large WASM/WebGL bundle,
// so it's loaded client-side only and kept out of the initial page JS.
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

const SCENE_URL = "https://prod.spline.design/qcICZX7w7KfztpZr/scene.splinecode";

/**
 * The character, cropped to a bust.
 *
 * Spline fits its camera to whatever canvas size it's given, so the crop is
 * done by making the canvas substantially TALLER than the visible box and
 * anchoring it to the top: the scene scales up to fill that taller area and
 * everything past the visible box — here, below the lower chest — is clipped
 * away by `overflow-hidden` on the parent.
 *
 * `heightScale` is therefore the knob to turn if the cut lands in the wrong
 * place: raise it to crop higher up the body, lower it to reveal more. It's a
 * prop rather than a magic number because the exact framing depends on how the
 * scene itself is composed.
 */
export function ChatSplineCharacter({ heightScale = 195 }: { heightScale?: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 transition-opacity duration-1000"
        style={{ height: `${heightScale}%`, opacity: loaded ? 1 : 0 }}
      >
        <Spline
          scene={SCENE_URL}
          onLoad={() => setLoaded(true)}
          className="pointer-events-auto h-full w-full"
        />
      </div>

      {/* Softens the clipped edge into the page instead of leaving a razor
          line across the chest. Sits above the canvas, below page content. */}
      <div className="absolute inset-x-0 bottom-0 h-[14%] bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
