export type Theme = "dark" | "light";

/** The whole contract is one attribute plus one storage key: `<html
 * data-theme>` drives every token in globals.css, and localStorage remembers
 * the choice across visits. Nothing else needs a provider or context. */
export const THEME_STORAGE_KEY = "theme";

/** Runs synchronously in <head> (see app/layout.tsx) so a saved theme is on
 * the element before the browser paints. Without it, a light-mode visitor
 * gets a flash of the dark default on every hard load, since localStorage
 * can't be read during SSR. Guarded because Safari private mode throws on
 * localStorage access. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode, blocked cookies) — the theme still
    // applies for this session, it just won't survive a reload.
  }
}

export function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
