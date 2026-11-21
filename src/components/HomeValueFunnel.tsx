"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import gsap from "gsap";
import { captureAttribution, type Attribution } from "@/lib/attribution";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { track } from "@/lib/track";
import { Honeypot } from "@/components/Honeypot";

// ── Bndryiq embed contract ─────────────────────────────────────────────────

// bndryiq.vercel.app now 308s to www.bndryiq.com, so the frame loads from
// there. Messages are still accepted from the old host in case an old page
// posts from it.
// AJ, 2026-11-20: bndryiq's estimate stays hidden until it is ready. While
// this is false, /home-value asks for the address and Anthony emails a range
// within 24 hours. To turn it on, set this true and add Anthony's embed key
// (bndryiq.com/widgets) as `key` in the frame URL: bndryiq refuses every
// estimate from a frame without one.
const BNDRYIQ_LIVE = false;

const BNDRYIQ_ORIGIN = "https://www.bndryiq.com";
const BNDRYIQ_ORIGINS = new Set([BNDRYIQ_ORIGIN, "https://bndryiq.vercel.app"]);
const BNDRYIQ_EMBED_PATH = "/embed/valuation";

type BndryiqEstimate = {
  low: number;
  high: number;
  point: number;
  compsUsed: number;
  propertyClass: string | null;
};

// lat and lng are absent when the address was typed into a plain field (a
// city page's address box) rather than picked from bndryiq's autocomplete.
type BndryiqAddress = {
  address: string;
  lat?: number;
  lng?: number;
};

// ── Form ───────────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { value: "1-3mo", label: "1 to 3 months" },
  { value: "3-6mo", label: "3 to 6 months" },
  { value: "6-12mo", label: "6 to 12 months" },
  { value: "curious", label: "Just curious" },
  { value: "refinancing", label: "Refinancing" },
] as const;
type TimeframeValue = (typeof TIMEFRAMES)[number]["value"];

const contactSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  timeframe: z.enum(
    TIMEFRAMES.map((t) => t.value) as [TimeframeValue, ...TimeframeValue[]],
  ),
  message: z.string().optional(),
  // Asked for only while bndryiq is hidden; otherwise bndryiq supplies it.
  homeAddress: z.string().optional(),
  smsConsent: z.boolean().optional(),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});
type ContactValues = z.infer<typeof contactSchema>;

const addressSchema = contactSchema.extend({
  homeAddress: z.string().trim().min(5, "Enter your home's address"),
});

// ── Component ──────────────────────────────────────────────────────────────

// `cell` is Anthony's cell, shown in the bndryiq frame as the number to call.
export function HomeValueFunnel({ cell }: { cell: string }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const attributionRef = useRef<Attribution | null>(null);
  const searchParams = useSearchParams();

  // An address typed elsewhere (a city page's address box) arrives as
  // ?address=, with lat and lng only when something geocoded it. Either way
  // it is kept and forwarded to bndryiq, so the seller never types it twice.
  const presetAddress = useMemo<BndryiqAddress | null>(() => {
    const addr = searchParams?.get("address")?.trim();
    if (!addr) return null;
    const lat = parseFloat(searchParams?.get("lat") ?? "");
    const lng = parseFloat(searchParams?.get("lng") ?? "");
    return Number.isNaN(lat) || Number.isNaN(lng)
      ? { address: addr }
      : { address: addr, lat, lng };
  }, [searchParams]);

  const [iframeSrc, setIframeSrc] = useState<string>("");
  // Initial height fits just the address input + powered-by row. Bndryiq is
  // expected to push a taller value via the `bndryiq:height` postMessage
  // when the estimate result renders (see message handler below).
  const [iframeHeight, setIframeHeight] = useState<number>(340);
  const [address, setAddress] = useState<BndryiqAddress | null>(presetAddress);
  const [estimate, setEstimate] = useState<BndryiqEstimate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Mint visitor id + build the iframe URL on first mount.
  useEffect(() => {
    attributionRef.current = captureAttribution();
    const visitorId = getOrCreateVisitorId();
    track({ event: "home_value_view" });
    const params = new URLSearchParams({
      theme: "light",
      brand: "Anthony Stolp",
      company: "ExSell Experts | Epique Realty",
      phone: cell,
      website: "anthonystolp.com",
      visitor_id: visitorId,
      return_url: typeof window !== "undefined" ? window.location.href : "",
    });
    // bndryiq reads ?address= (and lat, lng when known) on load and opens its
    // property questions for it. Address PII in the URL is the tradeoff:
    // the alternative is making the seller retype the address they just gave.
    if (presetAddress) {
      params.set("address", presetAddress.address);
      if (presetAddress.lat !== undefined && presetAddress.lng !== undefined) {
        params.set("lat", presetAddress.lat.toString());
        params.set("lng", presetAddress.lng.toString());
      }
    }
    if (BNDRYIQ_LIVE) {
      setIframeSrc(`${BNDRYIQ_ORIGIN}${BNDRYIQ_EMBED_PATH}?${params.toString()}`);
    }
  }, []);

  // Messages from the bndryiq frame. Its contract (bndryiq's
  // valuation-embed-client.tsx) is flat, with no wrapper object:
  //   { type: "bndryiq:height", height }
  //   { type: "bndryiq:estimate", address, lat, lng, estimate, visitorId }
  // An estimate arrives only after the seller answers bndryiq's property
  // questions or skips them.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!BNDRYIQ_ORIGINS.has(e.origin)) return;
      const data = e.data as
        | ({ type?: string; height?: number; estimate?: BndryiqEstimate } & Partial<BndryiqAddress>)
        | null;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "bndryiq:estimate": {
          if (typeof data.address !== "string" || !data.estimate) return;
          setAddress({ address: data.address, lat: data.lat, lng: data.lng });
          setEstimate(data.estimate);
          track({
            event: "estimate_seen",
            properties: {
              address: data.address,
              lat: data.lat,
              lng: data.lng,
              low: data.estimate.low,
              high: data.estimate.high,
              point: data.estimate.point,
              compsUsed: data.estimate.compsUsed,
            },
          });
          break;
        }
        case "bndryiq:height": {
          const h = data.height;
          if (typeof h === "number" && h > 100 && h < 4000) {
            setIframeHeight(Math.ceil(h));
          }
          break;
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Entry fade.
  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hv-fade",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.0,
          ease: "expo.out",
          stagger: 0.06,
        },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [submitted]);

  const handleSubmit = useCallback(
    async (values: ContactValues) => {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "home-value",
          funnelStep: "completed",
          intent: "sell",
          ...values,
          address: values.homeAddress?.trim() || address?.address,
          lat: values.homeAddress ? undefined : address?.lat,
          lng: values.homeAddress ? undefined : address?.lng,
          homeAddress: undefined,
          hp_company: honeypot,
          ...(attributionRef.current ?? {}),
          // Extra fields persisted via the raw payload; /api/lead also reads
          // visitorId and bndryiqEstimate at the top level (handled by the
          // permissive zod passthrough plus explicit columns in DB).
          visitorId: getOrCreateVisitorId(),
          bndryiqEstimate: estimate,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Try again?");
      }
      track({
        event: "home_value_lead",
        properties: {
          hasEstimate: !!estimate,
          timeframe: values.timeframe,
        },
      });
      if (values.homeAddress) setAddress({ address: values.homeAddress.trim() });
      setSubmitted(true);
    },
    [address, estimate, honeypot],
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-white pb-32 pt-32 md:pt-40"
    >
      <div className="mx-auto w-full max-w-3xl px-6 md:px-12">
        {!submitted ? (
          <>
            <Header />
            <Honeypot value={honeypot} onChange={setHoneypot} />
            {BNDRYIQ_LIVE ? (
              <>
                <div className="hv-fade mt-12 overflow-hidden bg-white">
                  {iframeSrc && (
                    <iframe
                      src={iframeSrc}
                      width="100%"
                      height={iframeHeight}
                      style={{ border: "none", display: "block" }}
                      loading="lazy"
                      title="Free instant home value estimate"
                    />
                  )}
                </div>
                <PoweredBy />
                <PersonalAnalysisBlock
                  address={address}
                  estimate={estimate}
                  onSubmit={handleSubmit}
                />
              </>
            ) : (
              <ContactFormInline
                address={null}
                askAddress={presetAddress?.address ?? ""}
                estimate={null}
                onSubmit={handleSubmit}
              />
            )}
          </>
        ) : (
          <DoneStep address={address} estimate={estimate} />
        )}
      </div>
    </section>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <p className="hv-fade text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/70">
        Free Home Value
      </p>
      {/* Visual heading only — the page's real <h1> is server-rendered in
          home-value/page.tsx so crawlers see it without waiting on the
          client-side Suspense (useSearchParams) boundary to hydrate. */}
      <h2 className="hv-fade mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
        What&apos;s your
        <br />
        home worth?
      </h2>
      <p className="hv-fade mt-8 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
        {BNDRYIQ_LIVE ? (
          <>
            Get an instant range from real comparable sales below. Want a
            personal analysis? Drop me your info after, no pressure.
          </>
        ) : (
          <>
            Tell me the address and I&apos;ll email you an honest range within
            24 hours, based on what is actually selling nearby. No algorithm
            guess, no pressure.
          </>
        )}
      </p>
    </div>
  );
}

function PoweredBy() {
  return (
    <p className="hv-fade mt-3 text-right text-[10px] uppercase tracking-[0.28em] text-ink-soft/70">
      estimate by bndryiq
    </p>
  );
}

// ── Personal analysis ask (gated step) ─────────────────────────────────────

function PersonalAnalysisBlock({
  address,
  estimate,
  onSubmit,
}: {
  address: BndryiqAddress | null;
  estimate: BndryiqEstimate | null;
  onSubmit: (v: ContactValues) => Promise<void>;
}) {
  const hasAddress = !!address;

  return (
    <div className="hv-fade mt-20 border-t border-ink/10 pt-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent">
        Next
      </p>
      <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
        {hasAddress ? (
          <>
            Talk to Anthony
            <br />
            about {address.address.split(",")[0]}.
          </>
        ) : (
          <>
            Talk to Anthony
            <br />
            about your home.
          </>
        )}
      </h2>
      <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
        The instant estimate above is a good range. A personal analysis is
        better. I look at your specific finishes, recent upgrades, and the
        condition of comps that the algorithm cannot see, then email you a
        tighter number plus a strategy if you are considering selling.
      </p>

      <ContactFormInline
        address={address}
        estimate={estimate}
        onSubmit={onSubmit}
      />
    </div>
  );
}

// `askAddress` is set (to the prefill, often "") when the form must ask for
// the address itself, because bndryiq is hidden.
function ContactFormInline({
  address,
  askAddress,
  estimate,
  onSubmit,
}: {
  address: BndryiqAddress | null;
  askAddress?: string;
  estimate: BndryiqEstimate | null;
  onSubmit: (v: ContactValues) => Promise<void>;
}) {
  const asking = askAddress !== undefined;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(asking ? addressSchema : contactSchema),
    defaultValues: {
      timeframe: "curious",
      smsConsent: false,
      termsConsent: false,
      ...(asking ? { homeAddress: askAddress } : {}),
    },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const timeframeId = useId();
  const messageId = useId();
  const smsId = useId();
  const termsId = useId();
  const termsErrorId = useId();

  const startOnce = () => {
    if (hasStarted) return;
    setHasStarted(true);
    track({
      event: "form_started",
      properties: {
        source: "home-value",
        hasEstimate: !!estimate,
      },
    });
  };

  const internalSubmit = async (v: ContactValues) => {
    setSubmitError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Try again?",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(internalSubmit)}
      onFocus={startOnce}
      noValidate
      className="mt-10 space-y-8"
    >
      {address && (
        <div className="border border-ink/10 bg-cream-deep/40 px-4 py-3 text-[12px] text-ink-soft">
          <span className="uppercase tracking-[0.24em] text-ink-soft/70">
            About
          </span>{" "}
          <span className="font-medium text-ink">{address.address}</span>
        </div>
      )}

      {asking && (
        <Field
          label="Home address"
          autoComplete="street-address"
          required
          placeholder="Street, city"
          error={errors.homeAddress?.message}
          {...register("homeAddress")}
        />
      )}
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
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="Only if you'd like a text follow-up"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div>
        <label
          htmlFor={timeframeId}
          className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/70"
        >
          Thinking about selling
        </label>
        <select
          id={timeframeId}
          {...register("timeframe")}
          className="mt-3 w-full appearance-none border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none focus-visible:border-ink"
        >
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value} className="bg-white">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={messageId}
          className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/70"
        >
          Recent upgrades or notes (optional)
        </label>
        <textarea
          id={messageId}
          {...register("message")}
          rows={3}
          placeholder="New roof, kitchen reno, anything that affects value."
          className="mt-3 w-full resize-none border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none placeholder:text-ink/30 focus-visible:border-ink"
        />
      </div>

      <div className="space-y-4 pt-2">
        <label
          htmlFor={smsId}
          className="flex items-start gap-3 text-[12px] leading-[1.55] text-ink-soft/70"
        >
          <input
            id={smsId}
            type="checkbox"
            {...register("smsConsent")}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
          />
          <span>
            By checking this box, I agree to receive text messages from
            Anthony Stolp regarding real estate services, property inquiries,
            scheduling, and related communications. Message
            frequency varies. Message and data rates may apply. Reply HELP
            for help or STOP to opt out.
          </span>
        </label>
        <label
          htmlFor={termsId}
          className="flex items-start gap-3 text-[12px] leading-[1.55] text-ink-soft/70"
        >
          <input
            id={termsId}
            type="checkbox"
            {...register("termsConsent")}
            aria-required="true"
            aria-invalid={errors.termsConsent ? "true" : undefined}
            aria-describedby={
              errors.termsConsent ? termsErrorId : undefined
            }
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
          />
          <span>
            By checking this box, I agree to the{" "}
            <a href="/terms" className="underline underline-offset-2">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </a>{" "}
            of this website.
          </span>
        </label>
        {errors.termsConsent && (
          <p
            id={termsErrorId}
            className="text-[11px] tracking-[0.12em] text-accent"
          >
            {errors.termsConsent.message}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex items-center gap-3 self-start border border-ink/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-ink transition-all hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Sending..."
            : asking
              ? "Ask for my home value"
              : "Talk to Anthony"}
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </button>
        {submitError && (
          <p role="alert" className="text-[11px] tracking-[0.12em] text-accent">
            {submitError}
          </p>
        )}
      </div>
    </form>
  );
}

// ── Done state ─────────────────────────────────────────────────────────────

function DoneStep({
  address,
  estimate,
}: {
  address: BndryiqAddress | null;
  estimate: BndryiqEstimate | null;
}) {
  return (
    <div role="status" aria-live="polite">
      <p className="hv-fade text-[11px] font-medium uppercase tracking-[0.38em] text-accent">
        Sent
      </p>
      <h2 className="hv-fade mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
        Got it.
        <br />
        Check your inbox.
      </h2>
      <p className="hv-fade mt-8 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
        {estimate
          ? "I'll personally email you a tighter, more strategic analysis"
          : "I'll personally email you an honest range"}
        {address ? (
          <>
            {" "}for{" "}
            <strong className="font-semibold text-ink">{address.address}</strong>
          </>
        ) : null}{" "}
        within 24 hours. If you have a moment, reply to that email with any
        upgrades or context I should know about.
      </p>

      {estimate && (
        <div className="hv-fade mt-10 border border-ink/10 bg-cream-deep/40 p-6">
          <p className="text-[10px] uppercase tracking-[0.32em] text-ink-soft/70">
            Instant range
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {formatPrice(estimate.low)} to {formatPrice(estimate.high)}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-ink-soft/70">
            {estimate.compsUsed} comparable sales · by bndryiq
          </p>
        </div>
      )}
    </div>
  );
}

function formatPrice(n: number): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ── Shared field ───────────────────────────────────────────────────────────

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
        className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/70"
      >
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className="mt-3 w-full border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none placeholder:text-ink/30 focus-visible:border-ink"
      />
      {error && (
        <p id={errorId} className="mt-2 text-[11px] tracking-[0.12em] text-accent">
          {error}
        </p>
      )}
    </div>
  );
};
