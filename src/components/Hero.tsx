"use client";

import Image from "next/image";
import Link from "next/link";
import { SearchGate, useSearchGate } from "./SearchGate";
import { STATUS_LABEL, type PropertyRow } from "@/lib/properties";
import { telHref } from "@/lib/phone";
import { FALLBACK_SEARCH } from "@/lib/listing-search";

type Props = {
  // Newest pending/sold listing, or null when there are none — also the
  // build-time case, since trySupabase() yields no rows without env vars.
  featured: PropertyRow | null;
  // Anthony's cell, from the agent profile. A string rather than the profile,
  // because this is a client component and its props ship to the browser.
  cell: string;
  // A time limited line under the buttons (src/lib/seasonal.ts), or null.
  seasonal: string | null;
};

export function Hero({ featured, cell, seasonal }: Props) {
  const gate = useSearchGate(FALLBACK_SEARCH);

  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-14 md:px-12 md:pt-36 md:pb-20">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-14">
          {/* Copy */}
          <div className="md:col-span-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-accent">
              Cedarburg · Ozaukee County · North Shore
            </p>

            <h1 className="mt-6 font-display text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.05] tracking-[-0.025em] text-ink">
              <span className="font-normal">Your partner for</span>{" "}
              <span className="font-semibold">Cedarburg and Ozaukee County real estate.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-ink/70 md:text-[16px]">
              Helping buyers and sellers in Cedarburg, Ozaukee County, and nearby
              Washington County towns like West Bend, Hartford, and Germantown.
              You work directly with me from the first call to closing. No
              scripts, just straight answers.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={gate.request}
                className="group inline-flex items-center justify-center gap-3 whitespace-nowrap border border-ink bg-ink px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-ink"
              >
                Browse active listings
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <Link
                href="/home-value"
                className="group inline-flex items-center justify-center gap-3 whitespace-nowrap border border-ink/20 px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-ink transition-all hover:border-ink"
              >
                What&apos;s my home worth?
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            {seasonal ? (
              <p className="mt-6 max-w-md text-[14px] leading-[1.6] text-ink/70">
                {seasonal}
              </p>
            ) : null}

            <a
              href={telHref(cell)}
              data-placement="hero"
              className={`${seasonal ? "mt-4" : "mt-6"} inline-block text-[14px] text-ink/75 underline-offset-4 transition-colors hover:text-ink hover:underline`}
            >
              Call or text Anthony: {cell}
            </a>
          </div>

          {/* Framed media */}
          {/* The headshot floats over the property card's lower left corner on
              desktop, and sits under it on mobile (AJ, 2026-11-20, T-062). */}
          <div className="relative md:col-span-6">
            {featured ? <FeaturedCard p={featured} /> : <FallbackFrame />}
            <figure className="mt-6 flex items-center gap-4 md:absolute md:-bottom-10 md:-left-10 md:mt-0 md:rounded-2xl md:bg-white md:p-3 md:pr-6 md:shadow-[0_18px_50px_-14px_rgba(26,28,28,0.3)]">
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink">
                <Image
                  src="/images/anthony-headshot.png"
                  alt="Anthony Stolp, Realtor"
                  fill
                  sizes="96px"
                  className="object-cover object-top"
                />
              </span>
              <figcaption className="text-[11px] uppercase leading-[1.6] tracking-[0.2em] text-ink/75">
                Anthony Stolp, Realtor
                <br />
                ExSell Experts | Epique Realty
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <SearchGate
        open={gate.open}
        onClose={gate.close}
        search={FALLBACK_SEARCH}
      />
    </section>
  );
}

function FeaturedCard({ p }: { p: PropertyRow }) {
  // "Recently sold in Thiensville" reads as news; "Sold in Thiensville" as a label.
  const status =
    p.status === "sold" ? "Recently sold" : (STATUS_LABEL[p.status] ?? p.status);
  const where = [status, p.city].filter(Boolean).join(" in ");

  return (
    <Link
      href={`/property/${p.slug}`}
      className="group relative block overflow-hidden rounded-[20px] bg-ink/5 shadow-[0_18px_50px_-14px_rgba(26,28,28,0.3)] transition-shadow duration-500 hover:shadow-[0_26px_64px_-14px_rgba(26,28,28,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
    >
      {p.photo_url ? (
        // Plain img so any URL (local /public now, S3 later) renders without
        // per-host next/image config. Optimization can come with S3.
        // object-top biases the crop toward the house rather than the lawn.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_url}
          alt={p.address}
          className="aspect-[4/3] w-full object-cover object-[center_38%] transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="aspect-[4/3] w-full" />
      )}

      {/* Floating label panel — the whole point of the card is to make the
          newest result legible above the fold. Opaque on purpose: at 90%
          white a dark patch of photo pulls the accent label to 3.9:1, under
          WCAG AA, and the shadow already lifts it off the photo. */}
      <div className="absolute left-4 top-4 max-w-[78%] rounded-[10px] bg-white px-5 py-4 shadow-[0_6px_20px_-8px_rgba(26,28,28,0.35)] md:left-6 md:top-6">
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
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-ink/5 shadow-[0_18px_50px_-14px_rgba(26,28,28,0.3)]">
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
