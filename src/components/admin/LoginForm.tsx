"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Login failed");
        return;
      }
      router.replace(next && next.startsWith("/admin") ? next : "/admin/leads");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <div>
        <label
          htmlFor="admin-password"
          className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none focus-visible:border-ink"
        />
      </div>
      {error && (
        <p role="alert" className="text-[11px] tracking-[0.12em] text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !password}
        className="inline-flex items-center gap-3 border border-ink/40 px-6 py-3 text-[11px] uppercase tracking-[0.32em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-50"
      >
        {submitting ? "Signing in..." : "Sign in"}
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
