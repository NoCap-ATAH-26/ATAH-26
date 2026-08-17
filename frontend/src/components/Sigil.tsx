type SigilKind = "cross" | "triangle" | "chevrons" | "diamond";

/** Small original geometric marks — not any real occult/religious symbol set,
 * just abstract line-art in the spirit of "sigilism" for the falling background. */
export function Sigil({ kind, size = 24 }: { kind: SigilKind; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    "aria-hidden": true,
  } as const;

  switch (kind) {
    case "cross":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "triangle":
      return (
        <svg {...common}>
          <path d="M12 3.5 21 20H3z" strokeLinejoin="round" />
          <circle cx="12" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chevrons":
      return (
        <svg {...common}>
          <path d="M4 6 12 12 20 6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12 12 18 20 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="1.5" transform="rotate(45 12 12)" />
          <rect x="9.5" y="9.5" width="5" height="5" transform="rotate(45 12 12)" />
        </svg>
      );
  }
}
