"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution, type Attribution } from "@/lib/attribution";
import { track } from "@/lib/track";
import { Honeypot } from "@/components/Honeypot";

const TIMEFRAMES = [
  { value: "1-3mo", label: "1 to 3 months" },
  { value: "3-6mo", label: "3 to 6 months" },
  { value: "6-12mo", label: "6 to 12 months" },
  { value: "curious", label: "Just curious" },
] as const;
type TimeframeValue = (typeof TIMEFRAMES)[number]["value"];

const schema = z.object({
  email: z.string().email("Valid email required"),
  timeframe: z.enum(
    TIMEFRAMES.map((t) => t.value) as [TimeframeValue, ...TimeframeValue[]],
  ),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});

type FormValues = z.infer<typeof schema>;

export type CampaignContext = {
  campaign_id?: string;
  target_id?: string;
  qr_token?: string;
  niche_slug?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  redirectUrl: string;
  campaignContext?: CampaignContext;
};

export function SearchGate({
  open,
  onClose,
  redirectUrl,
  campaignContext,
}: Props) {
  const emailId = useId();
  const timeframeId = useId();
  const termsId = useId();
  const formErrorId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const attributionRef = useRef<Attribution | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timeframe: "1-3mo", termsConsent: false },
  });

  useEffect(() => {
    if (!open) return;
    attributionRef.current = captureAttribution();
    track({ event: "search_gate_view", properties: campaignContext });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, campaignContext]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setSubmitError(null);
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "search-redirect",
            funnelStep: "completed",
            email: values.email,
            timeframe: values.timeframe,
            termsConsent: values.termsConsent,
            intent: "exploring",
            hp_company: honeypot,
            ...(attributionRef.current ?? {}),
            ...(campaignContext ? { raw: { campaignContext } } : {}),
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Something went wrong. Try again?");
        }
        track({
          event: "search_gate_lead",
          properties: { timeframe: values.timeframe, ...campaignContext },
        });
        window.location.href = redirectUrl;
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again?",
        );
      }
    },
    [campaignContext, redirectUrl],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${emailId}-title`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-4 py-6 backdrop-blur-sm md:items-center md:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg border border-cream/15 bg-ink p-8 text-cream md:p-10"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-[11px] uppercase tracking-[0.32em] text-cream/60 transition-colors hover:text-cream"
        >
          Close
        </button>

        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-cream/60">
          Active listings
        </p>
        <h2
          id={`${emailId}-title`}
          className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.02em]"
        >
          Where should I send matches?
        </h2>
        <p className="mt-3 text-[13px] leading-[1.7] text-cream/70">
          Browse the full feed in a second. First, drop your email and I&apos;ll
          send new listings the moment they hit MLS.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <div>
            <label
              htmlFor={emailId}
              className="block text-[11px] uppercase tracking-[0.32em] text-cream/60"
            >
              Email
            </label>
            <input
              {...register("email")}
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              ref={(el) => {
                register("email").ref(el);
                firstFieldRef.current = el;
              }}
              aria-invalid={errors.email ? "true" : undefined}
              className="mt-3 w-full border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none placeholder:text-cream/30 focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/40"
            />
            {errors.email && (
              <p className="mt-2 text-[11px] tracking-[0.12em] text-accent-soft">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={timeframeId}
              className="block text-[11px] uppercase tracking-[0.32em] text-cream/60"
            >
              Timeframe
            </label>
            <select
              id={timeframeId}
              {...register("timeframe")}
              className="mt-3 w-full appearance-none border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/40"
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.value} value={t.value} className="bg-ink">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <label
            htmlFor={termsId}
            className="flex items-start gap-3 text-[12px] leading-[1.55] text-cream/65"
          >
            <input
              id={termsId}
              type="checkbox"
              {...register("termsConsent")}
              aria-required="true"
              aria-invalid={errors.termsConsent ? "true" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cream"
            />
            <span>
              I agree to the{" "}
              <a
                href="/terms"
                className="underline underline-offset-2 hover:text-cream"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="underline underline-offset-2 hover:text-cream"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.termsConsent && (
            <p className="text-[11px] tracking-[0.12em] text-accent-soft">
              {errors.termsConsent.message}
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              aria-describedby={submitError ? formErrorId : undefined}
              className="group inline-flex items-center justify-center gap-3 border border-cream/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:border-cream hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "See active listings"}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
            {submitError && (
              <p
                id={formErrorId}
                role="alert"
                className="text-[11px] tracking-[0.12em] text-accent-soft"
              >
                {submitError}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
