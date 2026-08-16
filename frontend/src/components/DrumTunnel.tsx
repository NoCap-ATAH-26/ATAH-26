"use client";

import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MAX_ANGLE = 38;
const MAX_SHRINK = 0.12;
const MAX_DIM = 0.45;

/** Wraps a run of `<section>` children so the whole run reads as the inside
 * of a drum: every section's curve, scale, and dimness are recomputed every
 * scroll frame from its live distance to viewport-center, so whatever is
 * on screen right now is always curving away above and below you — the
 * one at center sits flat and full-bright, like the point of the tube wall
 * closest to your eye. A radial vignette frames the tube mouth around the
 * content, and a 3D wireframe cylinder on a fixed canvas rotates behind everything. */
export function DrumTunnel({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3D wireframe cylinder rendering loop (Inside Perspective)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // 3D cylinder settings for INSIDE perspective
    const R = 800;       // Cylinder radius
    const d_axis = 220;   // Axis offset (positive puts axis behind viewer, so walls curve towards us)
    const D = 900;       // Focal length (perspective)
    
    // Rings along the horizontal X axis
    const xPositions: number[] = [];
    for (let x = -1600; x <= 1600; x += 180) {
      xPositions.push(x);
    }

    // Longitudinal grid lines (spoke angles)
    const angles: number[] = [];
    const numAngles = 24;
    for (let i = 0; i < numAngles; i++) {
      angles.push((i * Math.PI * 2) / numAngles);
    }

    let lastScrollY = window.scrollY;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Smooth scroll tracking
      const targetScrollY = window.scrollY;
      lastScrollY += (targetScrollY - lastScrollY) * 0.1;
      
      // Calculate rotation (scroll position + slow idle rotation)
      const phi = lastScrollY * 0.0012 + time * 0.00015;

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.lineWidth = 1;

      // Project 3D coordinate (X, Y, Z) to 2D canvas coordinates
      // With axis at Z = +d_axis (behind user), the front wall (Z_rot < 0) curves towards us.
      const project = (X: number, Y_rot: number, Z_rot: number) => {
        const Z_w = Z_rot + d_axis;
        const distance = -Z_w; // Distance from eye at Z = 0 looking down negative Z

        // Clip anything that goes behind or too close to the camera
        if (distance < 50) return null;

        const scaleFactor = D / distance;
        const screenX = centerX + X * scaleFactor;
        const screenY = centerY + Y_rot * scaleFactor;
        return { x: screenX, y: screenY, z: Z_w, d: distance };
      };

      // 1. Draw circular rings (ribs of the drum)
      xPositions.forEach((X) => {
        const steps = 80;
        let drawing = false;

        for (let i = 0; i <= steps; i++) {
          const theta = (i * Math.PI * 2) / steps;
          const thetaRot = theta + phi;
          
          const Y = R * Math.sin(thetaRot);
          const Z = R * Math.cos(thetaRot);
          const pt = project(X, Y, Z);

          if (!pt) {
            drawing = false;
            continue;
          }

          // Fog / opacity based on distance (closer/clearer = brighter, far = faded)
          // pt.d goes from 50 (very close) to 1200 (far away)
          const opacity = Math.pow(Math.max(0, Math.min(1, 1 - (pt.d - 100) / 1100)), 2.8) * 0.28;

          ctx.strokeStyle = `rgba(139, 232, 203, ${opacity})`;

          if (!drawing) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            drawing = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
          }
        }
      });

      // 2. Draw longitudinal lines (connecting the rings)
      angles.forEach((theta) => {
        const thetaRot = theta + phi;
        const Y = R * Math.sin(thetaRot);
        const Z = R * Math.cos(thetaRot);

        let prevPt: ReturnType<typeof project> = null;

        for (let j = 0; j < xPositions.length; j++) {
          const pt = project(xPositions[j], Y, Z);

          if (!pt) {
            prevPt = null;
            continue;
          }

          if (prevPt) {
            const avgDistance = (prevPt.d + pt.d) / 2;
            const opacity = Math.pow(Math.max(0, Math.min(1, 1 - (avgDistance - 100) / 1100)), 2.8) * 0.14;

            ctx.strokeStyle = `rgba(139, 232, 203, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(prevPt.x, prevPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }

          prevPt = pt;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useGSAP(
    () => {
      const sections = gsap.utils.toArray<HTMLElement>(":scope > section", root.current!);
      
      // Pivot is IN FRONT of the screen (+1200px) so the top/bottom curve towards the viewer
      gsap.set(sections, { 
        transformPerspective: 1200, 
        transformOrigin: "50% 50% 1200px" 
      });

      const update = () => {
        const vh = window.innerHeight;
        const viewportCenter = vh / 2;
        const range = vh * 0.9;

        for (const section of sections) {
          const rect = section.getBoundingClientRect();
          const distance = rect.top + rect.height / 2 - viewportCenter;
          const progress = gsap.utils.clamp(-1.2, 1.2, distance / range);

          gsap.set(section, {
            // Rotation is positive/negative depending on progress, wrapping them around the eye
            rotateX: progress * MAX_ANGLE,
            // Offset the Z movement slightly to keep the active section center flat at Z=0
            z: -Math.abs(progress) * 160, 
            scale: 1 - Math.abs(progress) * MAX_SHRINK,
            opacity: 1 - Math.abs(progress) * MAX_DIM,
          });
        }
      };

      update();

      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: update,
        onRefresh: update,
      });

      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        toggleClass: { targets: root.current, className: "in-view" },
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className="drum-tunnel">
      <canvas ref={canvasRef} className="drum-tunnel__canvas" aria-hidden />
      <div className="drum-tunnel__vignette" aria-hidden />
      {children}
    </div>
  );
}
