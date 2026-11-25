"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution } from "@/lib/attribution";
import type { PropertyStatus } from "@/lib/properties";
import { track } from "@/lib/track";
import { Honeypot } from "@/components/Honeypot";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Valid email required"),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  slug: string;
  address: string;
  status: PropertyStatus;
  // A home still on the market is saved; a pending or sold one can only
  // point to others like it.
  variant: "save" | "similar";
};

const COPY = {
  save: {
    button: "Save this home",
    body: "I'll email you this home's details, plus similar homes nearby.",
    submit: "Save",
    done: "Saved. I'll email you this home's details soon. Call or text me at (262) 483-7932 if you want to see it.",
    source: "save-home",
  },
  similar: {
    button: "Get homes like this one",
    body: "I'll email you homes like this one as they come up nearby.",
    submit: "Send them to me",
    done: "You're set. I'll send homes like this one as they come up. Questions? Call or text me at (262) 483-7932.",
    source: "similar-homes",
  },
} as const;

// A button on every property page that opens a small inline email form
// (T-078). Never a modal: the page stays open and crawlable.
export function SaveHomeForm({ slug, address, status, variant }: Props) {
  const copy = COPY[variant];
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement | null>(null);

  const id = useId();
  const panelId = `${id}-panel`;
  const firstId = `${id}-first`;
  const firstErrorId = `${id}-first-error`;
  const lastId = `${id}-last`;
  const lastErrorId = `${id}-last-error`;
  const emailId = `${id}-email`;
  const emailErrorId = `${id}-email-error`;
  const termsId = `${id}-terms`;
  const termsErrorId = `${id}-terms-error`;
  const formErrorId = `${id}-form-error`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", termsConsent: false },
  });
  const firstField = register("firstName");

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  const onOpen = () => {
    setOpen(true);
    if (variant === "save") {
      track({
        event: "save_home_click",
        properties: { property_slug: slug, status, page_path: window.location.pathname },
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: copy.source,
          funnelStep: "completed",
          intent: "buy",
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          propertySlug: slug,
          address,
          propertyStatus: status,
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
        const page_path = window.location.pathname;
        if (variant === "save") {
          track({
            event: "save_home_lead",
            properties: { property_slug: slug, status, page_path },
          });
        } else {
          track({
            event: "similar_homes_lead",
            properties: { property_slug: slug, page_path },
          });
        }
      }
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again?");
    }
  };

  return (
    <div className="mt-6 border border-ink/15 p-6">
      <div role="status" aria-live="polite">
        {done ? <p className="text-[15px] leading-[1.7] text-ink">{copy.done}</p> : null}
      </div>
      {done ? null : (
        <>
          <button
            type="button"
            onClick={onOpen}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex min-h-11 w-full items-center justify-center border border-ink px-6 py-3 text-[12px] uppercase tracking-[0.28em] text-ink transition-all hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {copy.button}
          </button>
          <div id={panelId} hidden={!open}>
            <p className="mt-5 text-[14px] leading-[1.7] text-ink/75">{copy.body}</p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-5">
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={firstId} className="block text-[11px] uppercase tracking-[0.28em] text-ink/65">
                    First name
                  </label>
                  <input
                    id={firstId}
                    type="text"
                    autoComplete="given-name"
                    aria-required="true"
                    aria-invalid={errors.firstName ? "true" : undefined}
                    aria-describedby={errors.firstName ? firstErrorId : undefined}
                    {...firstField}
                    ref={(el) => {
                      firstField.ref(el);
                      firstRef.current = el;
                    }}
                    className="mt-2 w-full border-0 border-b border-ink/25 bg-transparent py-3 text-[16px] text-ink outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/30"
                  />
                  {errors.firstName ? (
                    <p id={firstErrorId} role="alert" className="mt-2 text-[12px] text-accent">
                      {errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor={lastId} className="block text-[11px] uppercase tracking-[0.28em] text-ink/65">
                    Last name
                  </label>
                  <input
                    id={lastId}
                    type="text"
                    autoComplete="family-name"
                    aria-required="true"
                    aria-invalid={errors.lastName ? "true" : undefined}
                    aria-describedby={errors.lastName ? lastErrorId : undefined}
                    {...register("lastName")}
                    className="mt-2 w-full border-0 border-b border-ink/25 bg-transparent py-3 text-[16px] text-ink outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/30"
                  />
                  {errors.lastName ? (
                    <p id={lastErrorId} role="alert" className="mt-2 text-[12px] text-accent">
                      {errors.lastName.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-[11px] uppercase tracking-[0.28em] text-ink/65"
                >
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
                  className="mt-2 w-full border-0 border-b border-ink/25 bg-transparent py-3 text-[16px] text-ink outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/30"
                />
                {errors.email ? (
                  <p id={emailErrorId} role="alert" className="mt-2 text-[12px] text-accent">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor={termsId}
                  className="flex items-start gap-3 text-[13px] leading-[1.55] text-ink/70"
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
              <button
                type="submit"
                disabled={isSubmitting}
                aria-describedby={submitError ? formErrorId : undefined}
                className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-6 py-3 text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
              >
                {isSubmitting ? "Sending…" : copy.submit}
              </button>
              {submitError ? (
                <p id={formErrorId} role="alert" className="text-[12px] text-accent">
                  {submitError}
                </p>
              ) : null}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
