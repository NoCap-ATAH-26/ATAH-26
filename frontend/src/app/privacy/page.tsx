import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — NoCap",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. What this document is",
    body: [
      "NoCap is a working prototype built for the Taskmaster track of the All Things Agentic Hackathon, not a mature commercial product. This policy describes what data the app actually handles today, in plain terms — it isn't legal advice, and you shouldn't connect anything you couldn't afford to have processed by a hackathon-stage system.",
    ],
  },
  {
    title: "2. What we collect",
    body: [
      "Account info: your email address and authentication state, via Supabase Auth.",
      "Document content: anything you upload manually, or that a connected source (Google Drive, Gmail, and so on) surfaces through the read-only scopes shown on the Connect Sources page.",
      "Pipeline data: the results Inspector, Repair, and Verifier produce for each document — status, risk score, issues found, sources cited, and the audit trail of decisions.",
      "Connection tokens: OAuth access/refresh tokens for any source you connect, stored server-side and never exposed to the browser.",
    ],
  },
  {
    title: "3. How it's used",
    body: [
      "Document content is sent to the configured LLM provider (Gemini or Mistral, depending on setup) to be inspected, and where needed, rewritten against your approved sources. Nothing is used to train a model beyond that provider's own standard API terms.",
      "Pipeline results and audit data are stored in Supabase (Postgres) and shown on your live dashboard.",
      "Critical results may trigger an email (via Resend) or a Slack notification, if those channels are configured.",
    ],
  },
  {
    title: "4. Connected sources",
    body: [
      "A connected source is only ever granted the read-only scope shown on its card on the Connect Sources page — never write access, and never more than what's listed. You can see exactly what's connected and disconnect it at any time from that page.",
    ],
  },
  {
    title: "5. Third parties involved",
    body: [
      "Supabase (database, auth, file storage), Google Cloud Pub/Sub (pipeline event routing), an LLM provider (Gemini or Mistral), Vercel (hosting), and, if configured, Resend (email) and Slack (alerts). Each processes only what's necessary to do its part of the pipeline.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "Documents and audit records are kept until you delete them or disconnect the source that provided them. There's no automated retention policy in this prototype yet — treat that as a gap, not a guarantee.",
    ],
  },
  {
    title: "7. Contact",
    body: [
      "This is a hackathon project without a dedicated privacy contact yet. Reach out through whichever channel you received access to NoCap from.",
    ],
  },
];

export default function PrivacyPage() {
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
          <h1 className="mt-3 font-display text-3xl italic sm:text-4xl">Privacy Policy</h1>
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
