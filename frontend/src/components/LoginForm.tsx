"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GithubGlyph, GoogleGlyph } from "./BrandGlyphs";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";
type PasswordAction = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [action, setAction] = useState<PasswordAction>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFormLoading(true);
    const supabase = createClient();

    if (action === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setFormLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setFormLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice("Account created — check your email to confirm before signing in.");
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFormLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setFormLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(`Magic link sent to ${email} — check your inbox.`);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="card-surface p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-ink-muted">Nocap.dev</div>
          <h1 className="mt-2 font-display text-2xl">Sign in to your dashboard</h1>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={oauthLoading !== null}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-border-strong disabled:opacity-60"
          >
            {oauthLoading === "github" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GithubGlyph size={16} />
            )}
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={oauthLoading !== null}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-border-strong disabled:opacity-60"
          >
            {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleGlyph size={16} />}
            Continue with Google
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-5 flex rounded-lg border border-border bg-surface-2 p-1 font-mono text-xs uppercase tracking-widest">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 transition",
              mode === "password" ? "bg-accent-lime text-bg" : "text-ink-muted hover:text-ink"
            )}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 transition",
              mode === "magic" ? "bg-accent-lime text-bg" : "text-ink-muted hover:text-ink"
            )}
          >
            Magic Link
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs text-ink-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent-lime"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs text-ink-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={action === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent-lime"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-lime px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-lime-dim disabled:opacity-60"
            >
              {formLoading && <Loader2 size={16} className="animate-spin" />}
              {action === "signin" ? "Sign in" : "Create account"}
            </button>
            <p className="text-center text-xs text-ink-muted">
              {action === "signin" ? "Need an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setAction(action === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
                className="text-accent-lime hover:underline"
              >
                {action === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
            <div>
              <label htmlFor="magic-email" className="mb-1 block text-xs text-ink-muted">
                Email
              </label>
              <input
                id="magic-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent-lime"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-lime px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-lime-dim disabled:opacity-60"
            >
              {formLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send magic link
            </button>
          </form>
        )}

        {error && (
          <p
            className="mt-4 rounded-lg border px-3 py-2 text-xs"
            style={{
              color: "var(--color-status-critical)",
              borderColor: "color-mix(in srgb, var(--color-status-critical) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-status-critical) 10%, transparent)",
            }}
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="mt-4 rounded-lg border px-3 py-2 text-xs"
            style={{
              color: "var(--color-status-good)",
              borderColor: "color-mix(in srgb, var(--color-status-good) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-status-good) 10%, transparent)",
            }}
          >
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
