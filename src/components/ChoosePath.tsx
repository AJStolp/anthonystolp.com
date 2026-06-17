import Link from "next/link";
import { HOME_VALUE_ENABLED, sellFallbackHref } from "@/lib/feature-flags";

// Homepage self-route: lets a visitor who already knows their intent jump
// straight into the right funnel instead of being funneled seller-first.
const SELL_HREF = HOME_VALUE_ENABLED ? "/home-value" : sellFallbackHref();

const PATHS = [
  {
    href: "/buy",
    eyebrow: "Buyers",
    title: "I'm buying",
    body: "Real listings the moment they hit, and a local read on every block.",
  },
  {
    href: SELL_HREF,
    eyebrow: "Sellers",
    title: "I'm selling",
    body: "An honest value range based on what is actually selling near you.",
  },
] as const;

export function ChoosePath() {
  return (
    <section className="w-full bg-cream py-20 text-ink md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/60">
          Where are you headed?
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {PATHS.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="group flex flex-col justify-between border border-ink/15 p-8 transition-colors hover:border-ink md:p-10"
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/55">
                  {p.eyebrow}
                </p>
                <h3 className="mt-4 font-display text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
                  {p.title}
                </h3>
                <p className="mt-4 max-w-sm text-[15px] leading-[1.7] text-ink-soft/80">
                  {p.body}
                </p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-ink">
                Start here
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
