"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroAddressInput } from "./HeroAddressInput";
import { SearchGate } from "./SearchGate";
import { HOME_VALUE_ENABLED, SELL_FALLBACK_HREF } from "@/lib/feature-flags";

const EXSELL_REDIRECT =
  "https://exsellexperts.com/?utm_source=anthonystolp&utm_medium=referral&utm_campaign=hero-search";

export function Hero() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <section className="relative isolate w-full overflow-hidden bg-ink">
      {/* Full-bleed image background.
          `isolate` on the section creates a fresh stacking context so the
          absolute background never escapes behind the page body. */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-wisco.png"
          alt="Wisconsin lakefront home at dusk, autumn foliage and lit interior"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Tint stack: a flat dark wash + a left-side gradient so the
            content side has more contrast while the image stays readable on the right. */}
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/45 via-ink/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-6 pt-32 pb-20 md:min-h-[80vh] md:px-12 md:pt-40 md:pb-28">
        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-cream/75">
          Ozaukee County · Greater Milwaukee
        </p>

        <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.75rem,6.5vw,5.75rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-cream">
          {HOME_VALUE_ENABLED ? (
            "What is your home worth?"
          ) : (
            <>
              Talk to a realist.
              <br />
              Not a realtor.
            </>
          )}
        </h1>

        <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-cream/90 md:text-[16px]">
          {HOME_VALUE_ENABLED
            ? "A real range from a local agent, sent within 24 hours. No Zestimate guesses, no marketing fluff. Just an honest number based on what is actually selling in your neighborhood."
            : "I find your exact net position before we negotiate, not after. When you sell and buy with the same agent, that precision compounds. No scripts, no fluff. Just real numbers."}
        </p>

        {HOME_VALUE_ENABLED ? (
          <>
            <HeroAddressInput onDark />
            <div className="mt-5 flex items-center gap-2 text-[13px] text-cream/80">
              <span>or</span>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="text-cream underline-offset-4 hover:underline"
              >
                browse active listings →
              </button>
            </div>
          </>
        ) : (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group inline-flex items-center justify-center gap-3 border border-cream bg-cream px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-ink transition-all hover:bg-transparent hover:text-cream"
            >
              Browse active listings
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
            <Link
              href={SELL_FALLBACK_HREF}
              className="group inline-flex items-center justify-center gap-3 border border-cream/40 px-7 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:border-cream"
            >
              Thinking about selling?
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        )}
      </div>

      <SearchGate
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        redirectUrl={EXSELL_REDIRECT}
      />
    </section>
  );
}
