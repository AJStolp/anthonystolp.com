"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution, type Attribution } from "@/lib/attribution";
import { listingSearchUrl, type ListingSearch } from "@/lib/listing-search";
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

// A visitor who has skipped, closed or answered the gate is not asked again
// for 30 days: the button takes them straight to the listings. Kept in
// localStorage as the time it runs out. Storage can be missing or throw (a
// private window, blocked site data), and then the gate simply opens again.
const GATE_SEEN_KEY = "as_gate_seen";
const GATE_SEEN_MS = 30 * 24 * 60 * 60 * 1000;

function gateSeen(): boolean {
  try {
    return Number(window.localStorage.getItem(GATE_SEEN_KEY)) > Date.now();
  } catch {
    return false;
  }
}

function rememberGate(): void {
  try {
    window.localStorage.setItem(GATE_SEEN_KEY, String(Date.now() + GATE_SEEN_MS));
  } catch {
    // Not remembered; the gate opens again next time, which is harmless.
  }
}

function goToListings(
  search: ListingSearch,
  source: "gate_skip" | "gate_submit" | "direct",
): void {
  track({ event: "search_outbound", properties: { town: search, source } });
  window.location.href = listingSearchUrl(search);
}

// What every "See active listings" button needs: `request` opens the gate,
// or goes straight to the listings for a visitor who has already seen it.
export function useSearchGate(search: ListingSearch) {
  const [open, setOpen] = useState(false);
  const request = useCallback(() => {
    if (gateSeen()) goToListings(search, "direct");
    else setOpen(true);
  }, [search]);
  const close = useCallback(() => setOpen(false), []);
  return { open, request, close };
}

export type CampaignContext = {
  campaign_id?: string;
  target_id?: string;
  qr_token?: string;
  niche_slug?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  // The AgentFire search a skip or a submit leads to.
  search: ListingSearch;
  campaignContext?: CampaignContext;
  // Lead source sent to /api/lead. Pages with their own funnel label pass one.
  source?: string;
  // Town the listings are for, shown in the heading. Omitted where the page
  // has no single town.
  town?: string;
};

export function SearchGate({
  open,
  onClose,
  search,
  campaignContext,
  source = "search-redirect",
  town,
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

  const dismiss = useCallback(() => {
    rememberGate();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    attributionRef.current = captureAttribution();
    track({ event: "search_gate_view", properties: campaignContext });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismiss, campaignContext]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setSubmitError(null);
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
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
        rememberGate();
        goToListings(search, "gate_submit");
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again?",
        );
      }
    },
    [campaignContext, search, source, honeypot],
  );

  // Straight to the listings with no email asked. Recorded so the gate's
  // conversion rate can be compared against the skips.
  const onSkip = useCallback(() => {
    rememberGate();
    track({
      event: "search_gate_skip",
      properties: { ...campaignContext, town: search, destination: "town_search" },
    });
    goToListings(search, "gate_skip");
  }, [campaignContext, search]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${emailId}-title`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-4 py-6 backdrop-blur-sm md:items-center md:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg border border-white/15 bg-ink p-8 text-white md:p-10"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-5 top-5 text-[11px] uppercase tracking-[0.32em] text-white/60 transition-colors hover:text-white"
        >
          Close
        </button>

        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-white/60">
          Active listings
        </p>
        <h2
          id={`${emailId}-title`}
          className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.02em]"
        >
          {town
            ? `Want new ${town} listings sent to you first?`
            : "Want new listings sent to you first?"}
        </h2>
        <p className="mt-3 text-[13px] leading-[1.7] text-white/70">
          Drop your email and I&apos;ll send new listings that match as they
          hit the MLS. No spam, unsubscribe any time. Or skip this and browse
          now.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <div>
            <label
              htmlFor={emailId}
              className="block text-[11px] uppercase tracking-[0.32em] text-white/60"
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
              className="mt-3 w-full border-0 border-b border-white/20 bg-transparent py-3 text-lg text-white outline-none placeholder:text-white/30 focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/40"
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
              className="block text-[11px] uppercase tracking-[0.32em] text-white/60"
            >
              Timeframe
            </label>
            <select
              id={timeframeId}
              {...register("timeframe")}
              className="mt-3 w-full appearance-none border-0 border-b border-white/20 bg-transparent py-3 text-lg text-white outline-none focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/40"
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
            className="flex items-start gap-3 text-[12px] leading-[1.55] text-white/65"
          >
            <input
              id={termsId}
              type="checkbox"
              {...register("termsConsent")}
              aria-required="true"
              aria-invalid={errors.termsConsent ? "true" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-white"
            />
            <span>
              I agree to the{" "}
              <a
                href="/terms"
                className="underline underline-offset-2 hover:text-white"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="underline underline-offset-2 hover:text-white"
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
              className="group inline-flex items-center justify-center gap-3 border border-white/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-white transition-all hover:border-white hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "See active listings"}
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
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 self-center px-2 py-3 text-[11px] uppercase tracking-[0.32em] text-white/60 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Skip, just show me listings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
