import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — NoCap",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Acceptance",
    body: [
      "By using NoCap, you agree to these terms. NoCap is a working prototype built for the Taskmaster track of the All Things Agentic Hackathon — use it accordingly.",
    ],
  },
  {
    title: "2. What the service does",
    body: [
      "NoCap ingests documents (manually uploaded or pulled from a connected source), runs them through an automated Inspector → Repair → Verifier pipeline backed by an LLM, and logs every decision to an audit trail shown on your dashboard.",
    ],
  },
  {
    title: "3. Your responsibilities",
    body: [
      "You're responsible for what you upload and what sources you connect. Don't connect accounts or upload documents you don't have the rights or permission to share with an automated pipeline.",
      "Connected sources are granted read-only access, scoped to exactly what's shown on the Connect Sources page — you're responsible for reviewing and revoking that access when it's no longer needed.",
    ],
  },
  {
    title: "4. No warranty",
    body: [
      "NoCap is provided \"as is,\" without warranty of any kind. Inspector/Repair/Verifier decisions are made by an LLM and can be wrong — nothing here should be treated as a guarantee of factual accuracy, and quarantined or approved status is not a substitute for human judgment on anything that matters.",
    ],
  },
  {
    title: "5. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, NoCap and its builders aren't liable for any damages arising from use of this prototype, including data loss, incorrect repairs, or decisions made based on its output.",
    ],
  },
  {
    title: "6. Changes",
    body: [
      "These terms may change as the project evolves. Continued use after a change means you accept the updated terms.",
    ],
  },
  {
    title: "7. Contact",
    body: [
      "This is a hackathon project without a dedicated legal contact yet. Reach out through whichever channel you received access to NoCap from.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="hud-grid" />
      <div className="relative z-10 flex-1 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-10 inline-block font-mono text-xs uppercase tracking-widest text-ink-muted hover:text-ink"
          >
            ← Back to nocap.dev
          </Link>

          <div className="hud-label uppercase">Legal</div>
          <h1 className="mt-3 font-display text-3xl italic sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 font-mono text-xs text-ink-faint">Last updated 2026-08-29</p>

          <div className="mt-10 space-y-8">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-medium text-ink">{section.title}</h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">
                  {section.body.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
