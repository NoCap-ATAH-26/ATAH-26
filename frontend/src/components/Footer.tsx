import Link from "next/link";

const LINK_GROUPS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [{ label: "About", href: "/about" }],
  },
  {
    heading: "Support",
    links: [{ label: "Help", href: "/help" }],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 md:col-span-1">
          <span className="font-mono text-sm font-bold text-ink">NOCAP.DEV</span>
          <p className="mt-2 max-w-[22ch] text-xs leading-relaxed text-ink-muted">
            Thinking in evidence. Guarding what&rsquo;s true.
          </p>
        </div>

        {LINK_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="hud-label uppercase">{group.heading}</div>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 font-mono text-[11px] text-ink-faint">
        NoCap — Taskmaster track, All Things Agentic Hackathon
      </div>
    </footer>
  );
}
