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

import { BNDRYIQ_ENABLED } from "@/lib/feature-flags";

// ── Bndryiq embed contract ─────────────────────────────────────────────────

const BNDRYIQ_ORIGIN = "https://bndryiq.vercel.app";
const BNDRYIQ_EMBED_PATH = "/embed/valuation";

type BndryiqEstimate = {
  low: number;
  high: number;
  point: number;
  confidence: "high" | "medium" | "low";
  compsUsed: number;
  propertyClass: string | null;
};

type BndryiqAddress = {
  address: string;
  lat: number;
  lng: number;
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
  smsConsent: z.boolean().optional(),
  termsConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to continue" }),
});
type ContactValues = z.infer<typeof contactSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function HomeValueFunnel() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const attributionRef = useRef<Attribution | null>(null);
  const searchParams = useSearchParams();

  // Hero-pre-fill: if the visitor came from the address autocomplete on /,
  // we have address + leadId in the URL. leadId is passed back to /api/lead
  // so completion updates the existing partial-lead row instead of creating a
  // duplicate. Address is also forwarded to bndryiq via postMessage in case
  // the iframe supports pre-fill.
  const presetAddress = useMemo<BndryiqAddress | null>(() => {
    if (!searchParams) return null;
    const addr = searchParams.get("address");
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    if (!addr || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { address: addr, lat, lng };
  }, [searchParams]);
  const presetLeadId = searchParams?.get("leadId") ?? null;

  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [iframeHeight, setIframeHeight] = useState<number>(720);
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
      company: "ExSell Experts at Epique Realty",
      phone: "(262) 885-3310",
      website: "anthonystolp.com",
      visitor_id: visitorId,
      return_url: typeof window !== "undefined" ? window.location.href : "",
    });
    setIframeSrc(`${BNDRYIQ_ORIGIN}${BNDRYIQ_EMBED_PATH}?${params.toString()}`);
  }, []);

  // Listen for postMessage events from the iframe.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== BNDRYIQ_ORIGIN) return;
      const data = e.data as { type?: string; payload?: unknown };
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "bndryiq:ready":
          track({ event: "iframe_ready", properties: { tool: "valuation" } });
          // Forward any hero-captured address to the iframe. If bndryiq
          // supports `bndryiq:set_address`, the iframe pre-fills; if not, the
          // message is silently ignored.
          if (presetAddress && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                type: "bndryiq:set_address",
                payload: {
                  address: presetAddress.address,
                  lat: presetAddress.lat,
                  lng: presetAddress.lng,
                },
              },
              BNDRYIQ_ORIGIN,
            );
          }
          break;
        case "bndryiq:estimate": {
          const p = data.payload as
            | (BndryiqAddress & { estimate: BndryiqEstimate })
            | undefined;
          if (!p || typeof p.address !== "string") return;
          setAddress({ address: p.address, lat: p.lat, lng: p.lng });
          setEstimate(p.estimate);
          track({
            event: "estimate_seen",
            properties: {
              address: p.address,
              lat: p.lat,
              lng: p.lng,
              low: p.estimate?.low,
              high: p.estimate?.high,
              point: p.estimate?.point,
              confidence: p.estimate?.confidence,
              compsUsed: p.estimate?.compsUsed,
            },
          });
          break;
        }
        case "bndryiq:height": {
          const h = (data.payload as { height?: number })?.height;
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
          // Pass leadId so /api/lead UPDATES the partial-lead row the hero
          // already created, instead of creating a duplicate.
          ...(presetLeadId ? { leadId: presetLeadId } : {}),
          address: address?.address,
          lat: address?.lat,
          lng: address?.lng,
          hp_company: honeypot,
          ...values,
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
      setSubmitted(true);
    },
    [address, estimate],
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-cream pb-32 pt-32 md:pt-40"
    >
      <div className="mx-auto w-full max-w-3xl px-6 md:px-12">
        {!submitted ? (
          <>
            <Header />
            {BNDRYIQ_ENABLED ? (
              <>
                <div className="hv-fade mt-12 overflow-hidden border border-ink/10 bg-cream">
                  {iframeSrc && (
                    <iframe
                      ref={iframeRef}
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
              </>
            ) : (
              <LookingUpBlock address={address} />
            )}

            <Honeypot value={honeypot} onChange={setHoneypot} />
            <PersonalAnalysisBlock
              address={address}
              estimate={estimate}
              onSubmit={handleSubmit}
            />
          </>
        ) : (
          <DoneStep address={address} estimate={estimate} />
        )}
      </div>
    </section>
  );
}

// ── Looking-up placeholder (shown when bndryiq is hidden) ──────────────────

function LookingUpBlock({ address }: { address: BndryiqAddress | null }) {
  return (
    <div className="hv-fade mt-12 border border-ink/10 bg-cream p-8 md:p-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-ink-soft/60">
        We have your address
      </p>
      {address ? (
        <p className="mt-4 font-display text-2xl font-semibold tracking-[-0.01em] text-ink md:text-3xl">
          {address.address}
        </p>
      ) : (
        <p className="mt-4 text-[15px] text-ink-soft">
          Drop your address below and I&apos;ll pull comps in your area.
        </p>
      )}
      <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-ink-soft/85">
        I&apos;ll pull recent sales on your block, look at what is actually
        selling vs sitting, and email you a clear range within 24 hours. No
        algorithm guess, no marketing fluff. Just an honest read from a local
        agent.
      </p>
      <p className="mt-4 text-[13px] leading-[1.6] text-ink-soft/65">
        Fill in your contact info below so I know where to send it.
      </p>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <p className="hv-fade text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/60">
        Free Home Value
      </p>
      <h1 className="hv-fade mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
        What&apos;s your
        <br />
        home worth?
      </h1>
      <p className="hv-fade mt-8 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
        Get an instant range from real comparable sales below. Want a
        personal analysis? Drop me your info after, no pressure.
      </p>
    </div>
  );
}

function PoweredBy() {
  return (
    <p className="hv-fade mt-3 text-right text-[10px] uppercase tracking-[0.28em] text-ink-soft/45">
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

function ContactFormInline({
  address,
  estimate,
  onSubmit,
}: {
  address: BndryiqAddress | null;
  estimate: BndryiqEstimate | null;
  onSubmit: (v: ContactValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      timeframe: "curious",
      smsConsent: false,
      termsConsent: false,
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
          <span className="uppercase tracking-[0.24em] text-ink-soft/60">
            About
          </span>{" "}
          <span className="font-medium text-ink">{address.address}</span>
        </div>
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
          className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
        >
          Thinking about selling
        </label>
        <select
          id={timeframeId}
          {...register("timeframe")}
          className="mt-3 w-full appearance-none border-0 border-b border-ink/20 bg-transparent py-3 text-lg text-ink outline-none focus-visible:border-ink"
        >
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value} className="bg-cream">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={messageId}
          className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
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
            Anthony Stolp regarding real estate services, property
            inquiries, scheduling, and related communications. Message
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
          className="group inline-flex items-center gap-3 self-start border border-ink/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-ink transition-all hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Talk to Anthony"}
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
        I&apos;ll personally email you a tighter, more strategic analysis
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
          <p className="text-[10px] uppercase tracking-[0.32em] text-ink-soft/55">
            Instant range
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {formatPrice(estimate.low)} to {formatPrice(estimate.high)}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-ink-soft/55">
            {estimate.compsUsed} comps · {estimate.confidence} confidence · by
            bndryiq
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
        className="block text-[11px] uppercase tracking-[0.32em] text-ink-soft/60"
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
