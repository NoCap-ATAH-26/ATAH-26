import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — NoCap",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="hud-grid" />
      <Link
        href="/"
        className="relative z-10 mb-10 font-mono text-xs uppercase tracking-widest text-ink-muted hover:text-ink"
      >
        ← Back to nocap.dev
      </Link>
      <div className="relative z-10">
        <LoginForm />
      </div>
    </main>
  );
}
