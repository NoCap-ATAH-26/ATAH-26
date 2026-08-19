"use client";

import { useSyncExternalStore } from "react";
import { readTheme, subscribeToTheme, type Theme } from "@/lib/theme";

// SSR has no DOM to read, and the markup ships with data-theme="dark", so
// that's the honest server answer. useSyncExternalStore re-checks the client
// snapshot right after hydration and re-renders if the saved theme differs.
const getServerSnapshot = (): Theme => "dark";

/** Reads the live theme off `<html data-theme>`, backed by a MutationObserver
 * so canvas/WebGL components that can't express colors in CSS (the hero
 * vortex, the Three.js tunnel) re-render the moment the toggle flips. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, readTheme, getServerSnapshot);
}
