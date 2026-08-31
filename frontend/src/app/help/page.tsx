import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Help — NoCap",
};

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "How do I get documents into NoCap?",
    a: (
      <>
        Two ways: drag files into the upload panel on your dashboard, or connect a data source
        from{" "}
        <Link href="/dashboard/sources" className="text-ink underline underline-offset-2 hover:text-accent-lime">
          Connect Sources
        </Link>{" "}
        so new or changed content flows in automatically. Both land in the same pipeline.
      </>
    ),
  },
  {
    q: "What do the statuses mean?",
    a: (
      <>
        <strong className="text-ink">Approved</strong> — cleared and published as-is.{" "}
        <strong className="text-ink">Needs Repair</strong> / <strong className="text-ink">Repaired</strong> —
        Inspector found issues and Repair drafted a source-backed fix.{" "}
        <strong className="text-ink">Quarantined</strong> — held back for human review, not
        published.
      </>
    ),
  },
  {
    q: "Why is a document stuck at a stage?",
    a: "Each stage is triggered by an event and usually finishes in seconds. If something looks stuck for more than a few minutes, check the document's audit trail on the dashboard for the last logged reason, or check the notification bell for a critical alert.",
  },
  {
    q: "How do I connect Google Drive or Gmail?",
    a: (
      <>
        From{" "}
        <Link href="/dashboard/sources" className="text-ink underline underline-offset-2 hover:text-accent-lime">
          Connect Sources
        </Link>
        , click Connect on the Google card and grant read-only access. If you see &ldquo;access
        denied&rdquo;, your Google account likely isn&rsquo;t on the app&rsquo;s test-user list yet —
        that&rsquo;s a one-time setup step on our side, not something wrong with your account.
      </>
    ),
  },
  {
    q: "What access does a connected source get?",
    a: "Read-only, always, scoped to exactly what's listed on that source's card on the Connect Sources page. NoCap never requests write access and never touches anything outside the granted scope.",
  },
  {
    q: "I found a bug or have a question that isn't answered here.",
    a: "This is a hackathon prototype without a support team behind it yet — reach out through whichever channel you received access to NoCap from, and include the document/file name if it's pipeline-related.",
  },
];

export default function HelpPage() {
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

          <div className="hud-label uppercase">Help</div>
          <h1 className="mt-3 font-display text-3xl italic sm:text-4xl">Questions, answered.</h1>

          <div className="mt-10 space-y-6">
            {FAQS.map((item) => (
              <div key={item.q} className="card-surface p-6">
                <h3 className="text-sm font-medium text-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
