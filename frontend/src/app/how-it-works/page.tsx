import Link from "next/link";
import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";

export const metadata: Metadata = {
  title: "How it works — NoCap",
};

export default function HowItWorksPage() {
  return (
    <main className="relative z-10 flex-1">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 font-mono text-xs uppercase tracking-widest text-ink-muted sm:px-10">
        <Link href="/" className="hover:text-ink">
          ← Back to nocap.dev
        </Link>
        <Link href="/features" className="hover:text-ink">
          Features →
        </Link>
      </div>
      <HowItWorks />
    </main>
  );
}
