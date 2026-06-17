"use client";

import { useState } from "react";
import { z } from "zod";
import { captureAttribution } from "@/lib/attribution";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { Honeypot } from "@/components/Honeypot";

// Zip choices for v1. When multi-tenant, fetch from agent profile.
const ZIP_CHOICES = [
  { value: "53012", label: "Cedarburg (53012)" },
  { value: "53092", label: "Mequon / Thiensville (53092)" },
  { value: "53097", label: "Mequon (53097)" },
  { value: "53024", label: "Grafton (53024)" },
  { value: "53074", label: "Port Washington (53074)" },
  { value: "53080", label: "Saukville (53080)" },
] as const;

const schema = z.object({
  email: z.string().email("Valid email required"),
  zip: z.string().min(5).max(5),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});

export function MarketReportSubscribe() {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState<string>(ZIP_CHOICES[0]?.value ?? "");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, zip, termsConsent: consent });
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      const first =
        issues.email?.[0] ?? issues.zip?.[0] ?? issues.termsConsent?.[0];
      setError(first ?? "Check the form");
      return;
    }
    setSubmitting(true);
    try {
      const attribution = captureAttribution();
      const visitorId = getOrCreateVisitorId();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "market-report-subscribe",
          funnelStep: "completed",
          email,
          postalCode: zip,
          intent: "exploring",
          termsConsent: consent,
          hp_company: honeypot,
          visitorId,
          ...attribution,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="market-report"
      aria-labelledby="market-report-heading"
      className="relative w-full bg-cream py-24 text-ink md:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 md:grid-cols-12 md:gap-16 md:px-12">
        <div className="md:col-span-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/65">
            Monthly market report
          </p>
          <h2
            id="market-report-heading"
            className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.025em]"
          >
            Stay in the know
            <br />
            on your zip.
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
            Once a month, a short read on what is actually happening in your
            local market. Median prices, days on market, and what it means for
            you. No fluff, no sales pitches, no daily blasts.
          </p>
        </div>

        <div className="md:col-span-6">
          {done ? (
            <div
              role="status"
              aria-live="polite"
              className="flex h-full min-h-[260px] flex-col items-start justify-center border border-ink/15 bg-cream p-10"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent">
                Subscribed
              </p>
              <h3 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em]">
                You are on the list.
              </h3>
              <p className="mt-3 max-w-sm text-[14px] leading-[1.6] text-ink-soft/75">
                First report ships on the 1st of next month. Reply to it any
                time if you want to talk about your specific situation.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div>
                <label
                  htmlFor="mr-email"
                  className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
                >
                  Email
                </label>
                <input
                  id="mr-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-3 w-full border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none focus-visible:border-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="mr-zip"
                  className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
                >
                  Your zip
                </label>
                <select
                  id="mr-zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="mt-3 w-full appearance-none border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none focus-visible:border-ink"
                >
                  {ZIP_CHOICES.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                htmlFor="mr-terms"
                className="flex items-start gap-3 text-[12px] leading-[1.55] text-ink-soft/75"
              >
                <input
                  id="mr-terms"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-required="true"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Terms
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Privacy Policy
                  </a>
                  . Unsubscribe any time.
                </span>
              </label>

              {error ? (
                <p
                  role="alert"
                  className="text-[11px] tracking-[0.12em] text-accent"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex items-center gap-3 border border-ink bg-ink px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:bg-transparent hover:text-ink disabled:opacity-50"
              >
                {submitting ? "Subscribing…" : "Send me the report"}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
