"use client";

import { RefObject, useEffect, useState } from "react";

/** Real cursor position relative to a container, for the HUD coordinate readout. */
export function useMousePosition(ref: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      setPos({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      });
    }

    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
  }, [ref]);

  return pos;
}
