/** Melts two adjacent sections together at their seam. Sits in a zero-height
 * wrapper (contributes no layout space) with an absolutely positioned,
 * vertically-centered strip straddling the boundary — half over the section
 * above, half over the section below — so backdrop-filter genuinely samples
 * both sides' rendered content instead of being trapped inside either
 * section's own overflow-hidden box. */
export function SectionBlend() {
  return (
    <div className="relative h-0">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-56 -translate-y-1/2"
        style={{
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          maskImage: "linear-gradient(to bottom, transparent, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black, transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
