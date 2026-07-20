"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { captureAttribution, type Attribution } from "@/lib/attribution";
import { Honeypot } from "@/components/Honeypot";

const HAS_AGENT = ["no", "yes", "agent"] as const;

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  // Phone optional, but it is how the text follow-up reaches them.
  phone: z.string().optional(),
  hasAgent: z.enum(HAS_AGENT),
  smsConsent: z.boolean().optional(),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});
type FormValues = z.infer<typeof schema>;

export function PropertySignInForm({ propertySlug }: { propertySlug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const attributionRef = useRef<Attribution | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { hasAgent: "no", smsConsent: false, termsConsent: false },
  });

  useEffect(() => {
    attributionRef.current = captureAttribution();
  }, []);

  const agentId = useId();
  const smsId = useId();
  const termsId = useId();
  const termsErrorId = useId();
  const formErrorId = useId();

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          source: "open-house",
          propertySlug,
          hp_company: honeypot,
          landingPage:
            typeof window !== "undefined" ? window.location.href : undefined,
          ...(attributionRef.current ?? {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Try again?");
      }
      setSubmitted(true);
      reset();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Try again?",
      );
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[420px] flex-col items-start justify-center border border-cream/15 bg-ink p-10 text-cream"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent-soft">
          Signed in
        </p>
        <h3 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em]">
          Thanks for stopping by.
        </h3>
        <p className="mt-4 max-w-sm text-[15px] leading-[1.7] text-cream/70">
          I will send the full details your way shortly. Grab a coffee and enjoy
          the home.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-7 border border-cream/15 bg-ink p-8 text-cream md:p-10"
      noValidate
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-cream/60">
          Welcome
        </p>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em]">
          Sign in
        </h3>
        <p className="mt-3 text-[14px] leading-[1.6] text-cream/60">
          The owners like to know who came through, and I will send you the full
          details.
        </p>
      </div>

      <Honeypot value={honeypot} onChange={setHoneypot} />

      <Field
        label="Name"
        autoComplete="name"
        required
        error={errors.name?.message}
        {...register("name")}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        label="Phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="For a quick text with the details"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div>
        <label
          htmlFor={agentId}
          className="block text-[11px] uppercase tracking-[0.32em] text-cream/60"
        >
          Are you working with an agent?
        </label>
        <select
          id={agentId}
          {...register("hasAgent")}
          className="mt-3 w-full appearance-none border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/50"
        >
          <option value="no" className="bg-ink">
            No, I am not
          </option>
          <option value="yes" className="bg-ink">
            Yes, I am
          </option>
          <option value="agent" className="bg-ink">
            I am an agent
          </option>
        </select>
      </div>

      <div className="space-y-4 pt-1">
        <label
          htmlFor={smsId}
          className="flex items-start gap-3 text-[12px] leading-[1.55] text-cream/65"
        >
          <input
            id={smsId}
            type="checkbox"
            {...register("smsConsent")}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cream"
          />
          <span>
            By checking this box, I agree to receive text messages from Anthony
            Stolp regarding this and similar properties, scheduling, and related
            communications. Message frequency varies. Message and data rates may
            apply. Reply HELP for help or STOP to opt out.
          </span>
        </label>
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
            aria-describedby={errors.termsConsent ? termsErrorId : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cream"
          />
          <span>
            By checking this box, I agree to the{" "}
            <a
              href="/terms"
              className="underline underline-offset-2 hover:text-cream"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-cream"
            >
              Privacy Policy
            </a>{" "}
            of this website.
          </span>
        </label>
        {errors.termsConsent && (
          <p
            id={termsErrorId}
            className="text-[11px] tracking-[0.12em] text-accent-soft"
          >
            {errors.termsConsent.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-describedby={submitError ? formErrorId : undefined}
          className="group inline-flex items-center justify-center gap-3 border border-cream/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:border-cream hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
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
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = function Field({ label, error, id, ...props }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-[11px] uppercase tracking-[0.32em] text-cream/60"
      >
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className="mt-3 w-full border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none placeholder:text-cream/30 focus-visible:border-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft/40"
      />
      {error && (
        <p
          id={errorId}
          className="mt-2 text-[11px] tracking-[0.12em] text-accent-soft"
        >
          {error}
        </p>
      )}
    </div>
  );
};
