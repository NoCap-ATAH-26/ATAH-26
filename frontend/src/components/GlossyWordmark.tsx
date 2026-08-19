"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Glossy "inflated 3D" wordmark, built entirely with SVG filters rather than
 * WebGL/Three.js: a blurred alpha channel becomes a bump map, fed into
 * feSpecularLighting for the shine, clipped back to the letterforms, and
 * layered over a shaded base fill. Same visual family as the "hello" glass
 * text on haoqi.design, no 3D engine or font-outline extraction needed, so
 * it's guaranteed to render the same everywhere and is easy to re-tune.
 *
 * A feTurbulence + feDisplacementMap stage sits in front of the bump map so
 * the whole thing reads as liquid: a slow idle drift keeps it faintly
 * "flowing", and the specular point light chases the cursor on hover so the
 * shine tracks toward it.
 */
export function GlossyWordmark() {
  const svgRef = useRef<SVGSVGElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const lightRef = useRef<SVGFEPointLightElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const turbulence = turbulenceRef.current;
    if (!svg || !turbulence) return;

    const freq = { x: 0.01, y: 0.018 };
    const idleFlow = gsap.to(freq, {
      x: 0.024,
      y: 0.03,
      duration: 7,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate: () => turbulence.setAttribute("baseFrequency", `${freq.x} ${freq.y}`),
    });

    const floatTween = gsap.to(svg, {
      y: -12,
      duration: 3.4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    function handleLeave() {
      gsap.to(lightRef.current, { attr: { x: 140, y: -40 }, duration: 0.8, ease: "power3.out" });
    }
    function handleMove(e: MouseEvent) {
      const rect = svg!.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 640;
      const py = ((e.clientY - rect.top) / rect.height) * 220;
      gsap.to(lightRef.current, { attr: { x: px, y: py - 30 }, duration: 0.4, ease: "power3.out" });
    }

    svg.addEventListener("mouseleave", handleLeave);
    svg.addEventListener("mousemove", handleMove);
    return () => {
      idleFlow.kill();
      floatTween.kill();
      svg.removeEventListener("mouseleave", handleLeave);
      svg.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 640 220" className="w-full" role="img" aria-label="NoCap">
      <defs>
        {/* Colors for the gradient stops, both shadow floods, and the body's
            fill-opacity live in globals.css (.wm-*) so the whole wordmark
            re-themes with `<html data-theme>` — see the light-theme block
            there for why the pale theme needs a different treatment. */}
        <linearGradient id="wordmarkBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="wm-stop-0" />
          <stop offset="30%" className="wm-stop-1" />
          <stop offset="65%" className="wm-stop-2" />
          <stop offset="100%" className="wm-stop-3" />
        </linearGradient>

        <filter id="wordmarkGloss" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency="0.01 0.018"
            numOctaves="2"
            seed="7"
            result="flowNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="flowNoise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
            result="flowed"
          />
          <feGaussianBlur in="flowed" stdDeviation="4" result="bump" />
          <feSpecularLighting
            in="bump"
            surfaceScale="32"
            specularConstant="4.2"
            specularExponent="26"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight ref={lightRef} x="140" y="-40" z="140" />
          </feSpecularLighting>
          <feComposite in="spec" in2="flowed" operator="in" result="specClipped" />
          <feMerge>
            <feMergeNode in="flowed" />
            <feMergeNode in="specClipped" />
          </feMerge>
        </filter>

        <filter id="wordmarkShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="20" />
          <feOffset dx="0" dy="26" result="offsetblur" />
          <feFlood className="wm-flood-contact" />
          <feComposite in2="offsetblur" operator="in" />
        </filter>

        <filter id="wordmarkShadowSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="34" />
          <feOffset dx="0" dy="10" result="offsetblur" />
          <feFlood className="wm-flood-ambient" />
          <feComposite in2="offsetblur" operator="in" />
        </filter>
      </defs>

      {/* wide soft ambient shadow, depth behind the sharper contact shadow */}
      <text
        x="50%"
        y="57%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-wordmark wm-shadow-fill"
        fontSize="150"
        filter="url(#wordmarkShadowSoft)"
      >
        NoCap
      </text>

      {/* soft contact shadow, depth cue */}
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-wordmark wm-shadow-fill"
        fontSize="150"
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
        className="font-wordmark wm-body"
        fontSize="150"
        fill="url(#wordmarkBase)"
        filter="url(#wordmarkGloss)"
        style={{ cursor: "default" }}
      >
        NoCap
      </text>
    </svg>
  );
}
