"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroAddressInput } from "./HeroAddressInput";
import { SearchGate } from "./SearchGate";
import { HOME_VALUE_ENABLED, SELL_FALLBACK_HREF } from "@/lib/feature-flags";
import { STATUS_LABEL, type PropertyRow } from "@/lib/properties";

const EXSELL_REDIRECT =
  "https://exsellexperts.com/anthony-stolp/?utm_source=anthonystolp&utm_medium=referral&utm_campaign=hero-search";

type Props = {
  // Newest pending/sold listing, or null when there are none — also the
  // build-time case, since trySupabase() yields no rows without env vars.
  featured: PropertyRow | null;
};

export function Hero({ featured }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <section className="w-full bg-cream">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-14 md:px-12 md:pt-36 md:pb-20">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-14">
          {/* Copy */}
          <div className="md:col-span-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent">
              Ozaukee County · Greater Milwaukee
            </p>

            <h1 className="mt-6 font-display text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.025em] text-ink">
              {HOME_VALUE_ENABLED ? (
                <>
                  <span className="font-normal">What is your</span>{" "}
                  <span className="font-semibold">home worth?</span>
                </>
              ) : (
                <>
                  <span className="font-normal">Your partner for</span>{" "}
                  <span className="font-semibold">Wisconsin real estate.</span>
                </>
              )}
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-ink/70 md:text-[16px]">
              {HOME_VALUE_ENABLED
                ? "A real range from a local agent, sent within 24 hours. No Zestimate guesses, no marketing fluff. Just an honest number based on what is actually selling in your neighborhood."
                : "You work directly with me, backed by the ExSell Experts team. No scripts, no fluff, just straight answers from someone who works the Ozaukee County north shore every week."}
            </p>

            {HOME_VALUE_ENABLED ? (
              <>
                <HeroAddressInput />
                <div className="mt-5 flex items-center gap-2 text-[13px] text-ink/60">
                  <span>or</span>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="text-ink underline-offset-4 hover:underline"
                  >
                    browse active listings →
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="group inline-flex items-center justify-center gap-3 whitespace-nowrap border border-ink bg-ink px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-cream transition-all hover:bg-transparent hover:text-ink"
                >
                  Browse active listings
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <Link
                  href={SELL_FALLBACK_HREF}
                  className="group inline-flex items-center justify-center gap-3 whitespace-nowrap border border-ink/20 px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-ink transition-all hover:border-ink"
                >
                  Thinking about selling?
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Framed media */}
          <div className="md:col-span-6">
            {featured ? <FeaturedCard p={featured} /> : <FallbackFrame />}
          </div>
        </div>
      </div>

      <SearchGate
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        redirectUrl={EXSELL_REDIRECT}
      />
    </section>
  );
}

function FeaturedCard({ p }: { p: PropertyRow }) {
  const status = STATUS_LABEL[p.status] ?? p.status;
  const where = [status, p.city].filter(Boolean).join(" in ");

  return (
    <Link
      href={`/property/${p.slug}`}
      className="group relative block overflow-hidden bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
    >
      {p.photo_url ? (
        // Plain img so any URL (local /public now, S3 later) renders without
        // per-host next/image config. Optimization can come with S3.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_url}
          alt={p.address}
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="aspect-[4/3] w-full" />
      )}

      {/* Floating label panel — the whole point of the card is to make the
          newest result legible above the fold. */}
      <div className="absolute left-4 top-4 max-w-[78%] bg-cream px-5 py-4 md:left-6 md:top-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
          {where}
        </p>
        <p className="mt-2 font-display text-lg font-semibold leading-tight tracking-[-0.02em] text-ink">
          {p.address}
        </p>
        <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/70 underline underline-offset-4 transition-colors group-hover:text-ink">
          See the listing
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function FallbackFrame() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/5">
      <Image
        src="/images/hero-wisco.png"
        alt="Wisconsin lakefront home at dusk, autumn foliage and lit interior"
        fill
        priority
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
