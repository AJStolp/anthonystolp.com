"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const INTENTS = ["buy", "sell", "both", "exploring"] as const;
type Intent = (typeof INTENTS)[number];

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  // Phone is OPTIONAL — required by 10DLC compliance for SMS opt-in flow.
  phone: z.string().optional(),
  intent: z.enum(INTENTS),
  message: z.string().optional(),
  // SMS consent is optional (unchecked default per 10DLC).
  smsConsent: z.boolean().optional(),
  // Terms + Privacy is required to submit.
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});

type FormValues = z.infer<typeof schema>;

export function LeadForm() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { intent: "buy", smsConsent: false, termsConsent: false },
  });

  // Prefill intent from URL on mount: e.g. /?intent=sell#contact
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    if (intent && (INTENTS as readonly string[]).includes(intent)) {
      setValue("intent", intent as Intent);
    }
  }, [setValue]);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(".lead-fade", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative w-full bg-ink py-24 text-cream md:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-6 md:grid-cols-12 md:px-12">
        <div className="md:col-span-5">
          <p className="lead-fade text-[11px] font-medium uppercase tracking-[0.38em] text-cream/60">
            Let&apos;s talk
          </p>
          <h2 className="lead-fade mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Tell me where
            <br />
            you are.
          </h2>
          <p className="lead-fade mt-8 max-w-md text-[15px] leading-[1.7] text-cream/70">
            A quick note, a quick call. No pressure, no scripts. I read every
            message myself and reply within the day.
          </p>

          <div className="lead-fade mt-12">
            <a
              href="mailto:anthony@exsellexperts.com"
              className="text-[13px] lowercase tracking-[0.12em] text-cream/70 transition-colors hover:text-cream"
            >
              anthony@exsellexperts.com
            </a>
          </div>
        </div>

        <div className="md:col-span-7">
          {submitted ? (
            <div className="lead-fade flex h-full min-h-[400px] flex-col items-start justify-center border border-cream/15 p-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent-soft">
                Sent
              </p>
              <h3 className="mt-4 font-display text-4xl font-semibold tracking-[-0.02em]">
                Got it. I&apos;ll be in touch soon.
              </h3>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-8 text-[11px] uppercase tracking-[0.32em] text-cream/60 underline-offset-4 hover:underline"
              >
                Send another →
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="lead-fade space-y-8"
              noValidate
            >
              <Field
                label="Name"
                error={errors.name?.message}
                {...register("name")}
              />
              <Field
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register("email")}
              />
              <Field
                label="Phone (optional)"
                type="tel"
                placeholder="Only if you'd like a text follow-up"
                error={errors.phone?.message}
                {...register("phone")}
              />

              <div>
                <label className="block text-[11px] uppercase tracking-[0.32em] text-cream/60">
                  I&apos;m looking to
                </label>
                <select
                  {...register("intent")}
                  className="mt-3 w-full appearance-none border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none focus:border-accent-soft"
                >
                  <option value="buy" className="bg-ink">
                    Buy a home
                  </option>
                  <option value="sell" className="bg-ink">
                    Sell my home
                  </option>
                  <option value="both" className="bg-ink">
                    Buy and sell
                  </option>
                  <option value="exploring" className="bg-ink">
                    Just exploring
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.32em] text-cream/60">
                  Anything else?
                </label>
                <textarea
                  {...register("message")}
                  rows={3}
                  className="mt-3 w-full resize-none border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none placeholder:text-cream/30 focus:border-accent-soft"
                  placeholder="Neighborhoods, timing, anything on your mind."
                />
              </div>

              {/* 10DLC consent — exact wording per Lofty's Sole Proprietor checkbox spec */}
              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-3 text-[12px] leading-[1.55] text-cream/65">
                  <input
                    type="checkbox"
                    {...register("smsConsent")}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cream"
                  />
                  <span>
                    By checking this box, I agree to receive text messages from
                    Anthony Stolp regarding real estate services, property
                    inquiries, scheduling, and related communications. Message
                    frequency varies. Message and data rates may apply. Reply
                    HELP for help or STOP to opt out.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-[12px] leading-[1.55] text-cream/65">
                  <input
                    type="checkbox"
                    {...register("termsConsent")}
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
                  <p className="text-[11px] tracking-[0.12em] text-accent-soft">
                    {errors.termsConsent.message}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex items-center gap-3 self-start border border-cream/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:border-cream hover:bg-cream hover:text-ink disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send"}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </button>
                {submitError && (
                  <p className="text-[11px] tracking-[0.12em] text-accent-soft">
                    {submitError}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = function Field({ label, error, ...props }: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.32em] text-cream/60">
        {label}
      </label>
      <input
        {...props}
        className="mt-3 w-full border-0 border-b border-cream/20 bg-transparent py-3 text-lg text-cream outline-none placeholder:text-cream/30 focus:border-accent-soft"
      />
      {error && (
        <p className="mt-2 text-[11px] tracking-[0.12em] text-accent-soft">
          {error}
        </p>
      )}
    </div>
  );
};
