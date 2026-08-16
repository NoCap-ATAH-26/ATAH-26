"use client";

/**
 * Glossy "inflated 3D" wordmark, built entirely with SVG filters rather than
 * WebGL/Three.js: a blurred alpha channel becomes a bump map, fed into
 * feSpecularLighting for the shine, clipped back to the letterforms, and
 * layered over a shaded base fill. Same visual family as the "hello" glass
 * text on haoqi.design, no 3D engine or font-outline extraction needed, so
 * it's guaranteed to render the same everywhere and is easy to re-tune.
 */
export function GlossyWordmark() {
  return (
    <svg viewBox="0 0 640 220" className="w-full" role="img" aria-label="NoCap">
      <defs>
        <linearGradient id="wordmarkBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaffb0" />
          <stop offset="45%" stopColor="var(--color-accent-lime)" />
          <stop offset="100%" stopColor="var(--color-accent-lime-dim)" />
        </linearGradient>

        <filter id="wordmarkGloss" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="bump" />
          <feSpecularLighting
            in="bump"
            surfaceScale="7"
            specularConstant="1.1"
            specularExponent="16"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight x="140" y="-40" z="180" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specClipped" />
          </feMerge>
        </filter>

        <filter id="wordmarkShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
          <feOffset dx="0" dy="14" result="offsetblur" />
          <feFlood floodColor="#000000" floodOpacity="0.45" />
          <feComposite in2="offsetblur" operator="in" />
        </filter>
      </defs>

      {/* soft contact shadow, depth cue */}
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-wordmark"
        fontSize="150"
        fill="#000000"
        filter="url(#wordmarkShadow)"
      >
        NoCap
      </text>

      {/* glossy body */}
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-wordmark"
        fontSize="150"
        fill="url(#wordmarkBase)"
        stroke="var(--color-accent-lime-dim)"
        strokeWidth="1"
        filter="url(#wordmarkGloss)"
      >
        NoCap
      </text>
    </svg>
  );
}
