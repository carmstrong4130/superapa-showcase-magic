import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in · SuperApa" },
      { name: "description", content: "Sign in to SuperApa to access the Dagger fleet log." },
      { property: "og:title", content: "Sign in · SuperApa" },
      { property: "og:description", content: "Sign in to SuperApa to access the Dagger fleet log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = next;
    });
  }, [next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + next },
      });
      setBusy(false);
      setMessage(error ? error.message : "Check your email to confirm your account.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    // Full navigation so the consent route re-reads the fresh session.
    window.location.href = next;
  }

  async function onGoogle() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + next },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="min-h-screen hud-grid grid place-items-center px-6">
      <div className="panel w-full max-w-sm p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">SuperApa</div>
        <h1 className="mt-1 text-xl font-semibold text-primary">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Access to the Dagger fleet log is restricted.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={onGoogle}
          className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Continue with Google
        </button>

        {message && (
          <p role="alert" className="mt-3 text-sm text-muted-foreground break-words">
            {message}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          type="button"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>

        <button
          onClick={() => navigate({ to: "/" })}
          type="button"
          className="mt-2 w-full font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Back to dashboard
        </button>
      </div>
    </main>
  );
}
