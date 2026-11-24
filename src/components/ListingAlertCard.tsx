"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution } from "@/lib/attribution";
import { BEDS, PRICE_RANGES } from "@/lib/listing-leads";
import { track } from "@/lib/track";
import { Honeypot } from "@/components/Honeypot";

const schema = z.object({
  email: z.string().email("Valid email required"),
  priceRange: z.string(),
  beds: z.string(),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});
type FormValues = z.infer<typeof schema>;

// A town page shows the card twice. Its view is counted once a page.
const viewedPaths = new Set<string>();

const fieldClass =
  "mt-2 w-full border-0 border-b border-ink/25 bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-ink/40 focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/30";
const labelClass = "block text-[11px] uppercase tracking-[0.28em] text-ink-soft/80";

// "Get new [Town] listings first": an inline sign up on each buy town page,
// never a modal (T-078). Anthony sets up each alert by hand in Lofty, and the
// copy promises only that.
export function ListingAlertCard({ town }: { town: string }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [done, setDone] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const id = useId();
  const headingId = `${id}-heading`;
  const emailId = `${id}-email`;
  const emailErrorId = `${id}-email-error`;
  const priceId = `${id}-price`;
  const bedsId = `${id}-beds`;
  const termsId = `${id}-terms`;
  const termsErrorId = `${id}-terms-error`;
  const formErrorId = `${id}-form-error`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priceRange: "", beds: "", termsConsent: false },
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      const path = window.location.pathname;
      if (viewedPaths.has(path)) return;
      viewedPaths.add(path);
      track({ event: "listing_alert_view", properties: { town, page_path: path } });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [town]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "listing-alert",
          funnelStep: "completed",
          intent: "buy",
          email: values.email,
          town,
          ...(values.priceRange ? { priceRange: values.priceRange } : {}),
          ...(values.beds ? { beds: values.beds } : {}),
          termsConsent: values.termsConsent,
          hp_company: honeypot,
          landingPage: window.location.href,
          ...captureAttribution(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Try again?");
      }
      const data = (await res.json().catch(() => ({}))) as { accepted?: boolean };
      // The honeypot answers 200 too, so only a real sign up is a conversion.
      if (data.accepted) {
        track({
          event: "listing_alert_lead",
          properties: {
            town,
            ...(values.priceRange ? { price_range: values.priceRange } : {}),
            ...(values.beds ? { beds: values.beds } : {}),
            page_path: window.location.pathname,
          },
        });
      }
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again?");
    }
  };

  return (
    <section
      ref={rootRef}
      aria-labelledby={headingId}
      className="mt-16 w-full border border-ink/15 p-6 md:p-8"
    >
      <h2
        id={headingId}
        className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink"
      >
        {`Get new ${town} listings first`}
      </h2>
      <div role="status" aria-live="polite">
        {done ? (
          <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
            {`You're set. I'll set up your ${town} alert myself and you'll see the first matches soon. Questions? Call or text me at (262) 483-7932.`}
          </p>
        ) : null}
      </div>
      {done ? null : (
        <>
          <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink-soft/80">
            {`Tell me what you're after and I'll send new ${town} listings that fit as soon as they hit the MLS. No spam, unsubscribe any time.`}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-6">
            <Honeypot value={honeypot} onChange={setHoneypot} />
            <div>
              <label htmlFor={emailId} className={labelClass}>
                Email
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-required="true"
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={errors.email ? emailErrorId : undefined}
                {...register("email")}
                className={fieldClass}
              />
              {errors.email ? (
                <p id={emailErrorId} role="alert" className="mt-2 text-[12px] text-accent">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor={priceId} className={labelClass}>
                  Price range (optional)
                </label>
                <select id={priceId} {...register("priceRange")} className={fieldClass}>
                  <option value="">Any price</option>
                  {PRICE_RANGES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={bedsId} className={labelClass}>
                  Beds (optional)
                </label>
                <select id={bedsId} {...register("beds")} className={fieldClass}>
                  <option value="">Any</option>
                  {BEDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor={termsId}
                className="flex items-start gap-3 text-[13px] leading-[1.55] text-ink-soft"
              >
                <input
                  id={termsId}
                  type="checkbox"
                  aria-required="true"
                  aria-invalid={errors.termsConsent ? "true" : undefined}
                  aria-describedby={errors.termsConsent ? termsErrorId : undefined}
                  {...register("termsConsent")}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms" className="underline underline-offset-2">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="underline underline-offset-2">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {errors.termsConsent ? (
                <p id={termsErrorId} role="alert" className="mt-2 text-[12px] text-accent">
                  {errors.termsConsent.message}
                </p>
              ) : null}
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-describedby={submitError ? formErrorId : undefined}
                className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
              >
                {isSubmitting ? "Sending…" : `Get ${town} listings`}
              </button>
              {submitError ? (
                <p id={formErrorId} role="alert" className="mt-3 text-[12px] text-accent">
                  {submitError}
                </p>
              ) : null}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
