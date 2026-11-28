"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution } from "@/lib/attribution";
import {
  NEWSLETTER_NAME,
  NEWSLETTER_SOURCE,
  NEWSLETTER_ZIPS,
  STREET_SMS_BODY,
} from "@/lib/newsletter";
import { smsHref, telHref } from "@/lib/phone";
import { track } from "@/lib/track";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { Honeypot } from "@/components/Honeypot";

// The River Report signup (T-113), replacing the homepage's monthly zip code
// report form. "card" is the full signup for pages, "compact" the one line
// email row in the site footer. Both post to /api/lead as
// market-report-subscribe, and the server sends a confirm email: nobody is on
// the list until they click it.

const ERRORS = {
  email: "That email doesn't look right. Mind checking it?",
  consent: "Check the box so I know it's OK to email you.",
};
const serverError = (cell: string) =>
  `Something went wrong on my end. Try again, or text me at ${cell}.`;

const zipValues = NEWSLETTER_ZIPS.map((z) => z.value) as [string, ...string[]];

const schema = z.object({
  email: z.string().trim().email(ERRORS.email),
  firstName: z.string().trim().max(60),
  zip: z.union([z.literal(""), z.enum(zipValues)]),
  termsConsent: z.boolean().refine((v) => v === true, { message: ERRORS.consent }),
});
type FormValues = z.infer<typeof schema>;

// Pages with a card and the footer row count one view, whichever is seen
// first.
const viewedPaths = new Set<string>();

const fieldClass =
  "mt-2 w-full border-0 border-b border-ink/25 bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-ink/50 focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/30";
const labelClass = "block text-[11px] uppercase tracking-[0.28em] text-ink-soft/80";
const linkClass = "underline underline-offset-2 hover:text-ink";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50";

export function NewsletterSignup({
  variant,
  placement,
  cell,
  id,
  streetCta = false,
}: {
  variant: "card" | "compact";
  // Anthony's cell, agent.mobilePhone, passed in from the server.
  cell: string;
  // Where it sits, sent with the lead and the events: "home", "footer", ...
  placement: string;
  // The homepage keeps id="market-report" so old links still land on it.
  id?: string;
  // The "Curious what your neighbors sold for?" block under the card.
  streetCta?: boolean;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const uid = useId();
  const ids = {
    heading: `${uid}-heading`,
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    firstName: `${uid}-first`,
    zip: `${uid}-zip`,
    terms: `${uid}-terms`,
    termsError: `${uid}-terms-error`,
    formError: `${uid}-form-error`,
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", firstName: "", zip: "", termsConsent: false },
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
      track({ event: "newsletter_view", properties: { placement, page_path: path } });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [placement]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: NEWSLETTER_SOURCE,
          funnelStep: "completed",
          intent: "exploring",
          email: values.email,
          ...(values.firstName ? { firstName: values.firstName } : {}),
          ...(values.zip ? { postalCode: values.zip } : {}),
          termsConsent: values.termsConsent,
          hp_company: honeypot,
          visitorId: getOrCreateVisitorId(),
          landingPage: window.location.href,
          placement,
          ...captureAttribution(),
        }),
      });
      if (!res.ok) throw new Error(`lead ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as { accepted?: boolean };
      // The honeypot answers 200 too, so only a real signup is a conversion.
      if (data.accepted) {
        track({
          event: "market_report_lead",
          properties: { ...(values.zip ? { zip: values.zip } : {}), placement },
        });
      }
      setSentTo(values.email);
    } catch {
      setSubmitError(serverError(cell));
    }
  };

  const emailInput = (
    <input
      id={ids.email}
      type="email"
      autoComplete="email"
      inputMode="email"
      placeholder={variant === "compact" ? "Your email" : undefined}
      aria-required="true"
      aria-invalid={errors.email ? "true" : undefined}
      aria-describedby={errors.email ? ids.emailError : undefined}
      {...register("email")}
      className={fieldClass}
    />
  );
  const emailError = errors.email ? (
    <p id={ids.emailError} role="alert" className="mt-2 text-[12px] text-accent">
      {errors.email.message}
    </p>
  ) : null;
  const consent = (text: React.ReactNode) => (
    <div>
      <label
        htmlFor={ids.terms}
        className="flex items-start gap-3 text-[13px] leading-[1.55] text-ink-soft"
      >
        <input
          id={ids.terms}
          type="checkbox"
          aria-required="true"
          aria-invalid={errors.termsConsent ? "true" : undefined}
          aria-describedby={errors.termsConsent ? ids.termsError : undefined}
          {...register("termsConsent")}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
        />
        <span>{text}</span>
      </label>
      {errors.termsConsent ? (
        <p id={ids.termsError} role="alert" className="mt-2 text-[12px] text-accent">
          {errors.termsConsent.message}
        </p>
      ) : null}
    </div>
  );
  const formError = submitError ? (
    <p id={ids.formError} role="alert" className="mt-3 text-[12px] text-accent">
      {submitError}
    </p>
  ) : null;

  if (variant === "compact") {
    return (
      <section ref={rootRef} aria-labelledby={ids.heading} className="relative w-full">
        <p id={ids.heading} className="text-sm leading-[1.6] text-ink/75">
          {`${NEWSLETTER_NAME}: Ozaukee and Washington County real estate, once a month.`}
        </p>
        <div role="status" aria-live="polite">
          {sentTo ? (
            <p className="mt-3 text-sm text-ink">Check your email for a confirm link.</p>
          ) : null}
        </div>
        {sentTo ? null : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 space-y-3">
            <Honeypot value={honeypot} onChange={setHoneypot} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-sm">
                <label htmlFor={ids.email} className="sr-only">
                  Email
                </label>
                {emailInput}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-describedby={submitError ? ids.formError : undefined}
                className={buttonClass}
              >
                {isSubmitting ? "Sending" : "Sign up"}
              </button>
            </div>
            {emailError}
            {consent(
              <>
                Send me the monthly newsletter.{" "}
                <a href="/terms" className={linkClass}>
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className={linkClass}>
                  Privacy
                </a>
                . Unsubscribe any time.
              </>,
            )}
            {formError}
          </form>
        )}
      </section>
    );
  }

  return (
    <section
      ref={rootRef}
      id={id}
      aria-labelledby={ids.heading}
      className="relative w-full border border-ink/15 bg-white p-6 text-ink md:p-10"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/80">
        Monthly newsletter
      </p>
      <h2
        id={ids.heading}
        className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]"
      >
        {NEWSLETTER_NAME}
      </h2>
      <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
        Once a month I send a short email on what&apos;s actually happening in
        Ozaukee and Washington County real estate. A little local news, the
        numbers that matter, and a quick read on your own zip code if you pick
        one. Every number has a source. No daily blasts, no sales pitch.
      </p>

      <div role="status" aria-live="polite">
        {sentTo ? (
          <div className="mt-8">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
              Almost done. Check your email.
            </h3>
            <p className="mt-3 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
              {`I just sent a confirm link to ${sentTo}. Click it and you're on the list. ${NEWSLETTER_NAME} goes out the first Tuesday of the month.`}
            </p>
            <p className="mt-3 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
              {`Don't see it? Check promotions or spam, or text me at ${cell}.`}
            </p>
          </div>
        ) : null}
      </div>

      {sentTo ? null : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-6">
          <Honeypot value={honeypot} onChange={setHoneypot} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.email} className={labelClass}>
                Email
              </label>
              {emailInput}
              {emailError}
            </div>
            <div>
              <label htmlFor={ids.firstName} className={labelClass}>
                First name (optional)
              </label>
              <input
                id={ids.firstName}
                type="text"
                autoComplete="given-name"
                {...register("firstName")}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor={ids.zip} className={labelClass}>
              Your zip (optional)
            </label>
            <select id={ids.zip} {...register("zip")} className={fieldClass}>
              <option value="">Pick a zip for your local numbers</option>
              {NEWSLETTER_ZIPS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          {consent(
            <>
              {`Send me ${NEWSLETTER_NAME} once a month. I agree to the `}
              <a href="/terms" className={linkClass}>
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className={linkClass}>
                Privacy Policy
              </a>
              . Unsubscribe any time.
            </>,
          )}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-describedby={submitError ? ids.formError : undefined}
              className={buttonClass}
            >
              {isSubmitting ? "Sending" : `Send me ${NEWSLETTER_NAME}`}
            </button>
            {formError}
          </div>
        </form>
      )}

      {streetCta ? (
        <div className="mt-12 border-t border-ink/10 pt-10">
          <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            Curious what your neighbors sold for?
          </h3>
          <p className="mt-3 max-w-xl text-[15px] leading-[1.7] text-ink-soft">
            Text me your street and I&apos;ll send what nearby homes sold for. No
            forms, no spam, just the numbers.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={smsHref(cell, STREET_SMS_BODY)}
              data-placement="newsletter_street_sms"
              className={buttonClass}
            >
              Text me your street
            </a>
            <a
              href={telHref(cell)}
              data-placement="newsletter_street_call"
              className="inline-flex min-h-11 items-center justify-center border border-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-ink transition-all hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {`Call ${cell}`}
            </a>
          </div>
          <p className="mt-4 text-[13px] leading-[1.6] text-ink-soft">
            Or get a{" "}
            <a href="/home-value" className={linkClass}>
              free home value
            </a>
            , personally prepared within 24 hours.
          </p>
        </div>
      ) : null}
    </section>
  );
}
