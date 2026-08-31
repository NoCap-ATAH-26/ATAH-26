import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, GitBranch, ScrollText } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "About — NoCap",
};

export default function AboutPage() {
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

          <div className="hud-label uppercase">About</div>
          <h1 className="mt-3 font-display text-3xl italic sm:text-4xl">No chatbot lies.</h1>

          <div className="mt-8 space-y-5 text-sm leading-relaxed text-ink-muted">
            <p>
              NoCap is an autonomous agent that catches and fixes bad data before it ever
              becomes an answer. Knowledge bases quietly rot: AI-generated content feeds back
              into the same index, synthetic or stale claims get cited as fact, and nobody
              notices until a customer catches the mistake. NoCap watches the ingest pipe so
              that never happens silently.
            </p>
            <p>
              Every document that enters the knowledge base — uploaded by hand or pulled in
              automatically from a connected source — moves through the same three-stage,
              event-driven pipeline, with zero human in the loop and a full audit log of every
              decision.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Inspector",
                body: "Scores provenance, factual support, duplication, freshness, and synthetic-content risk.",
              },
              {
                icon: GitBranch,
                title: "Repair",
                body: "Drafts a corrected, source-backed replacement for anything below the bar.",
              },
              {
                icon: ScrollText,
                title: "Verifier",
                body: "Checks the repair against approved sources, then approves, quarantines, or publishes.",
              },
            ].map((stage) => (
              <div key={stage.title} className="card-surface p-5">
                <stage.icon size={18} className="text-accent-lime" />
                <h3 className="mt-3 text-sm font-medium text-ink">{stage.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{stage.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-5 text-sm leading-relaxed text-ink-muted">
            <p>
              NoCap was built for the Taskmaster track of the All Things Agentic Hackathon. It&rsquo;s
              a working prototype, not a polished enterprise product — the pipeline, audit log,
              and live dashboard are all real and running, but you should read our{" "}
              <Link href="/terms" className="text-ink underline underline-offset-2 hover:text-accent-lime">
                Terms of Service
              </Link>{" "}
              before pointing it at anything you care about.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
