import type { Metadata } from "next";
import Image from "next/image";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Nav } from "@/components/Nav";
import { LeadForm } from "@/components/LeadForm";
import { Footer } from "@/components/Footer";
import { NorthwoodsSearch } from "@/components/NorthwoodsSearch";
import { NORTHWOODS_SOURCES, NORTHWOODS_TEAM, telHref, type TeamMember } from "@/lib/northwoods";
import { OG_IMAGES } from "@/lib/og";

// Landing page for the printed Marinette County flyer. The QR code points at
// /northwoods?utm_source=flyer&utm_medium=print&utm_campaign=northwoods, which
// the site's existing attribution records on every lead from this page.

export const metadata: Metadata = {
  title: "Northwoods Real Estate · Marinette County",
  description:
    "Jay and Anthony Stolp, REALTORS® who grew up in the Northwoods. Homes, lake lots, and land across Marinette County, with drone aerial photography for sellers.",
  alternates: { canonical: "/northwoods" },
  openGraph: {
    title: "From the ground and air, we know this land.",
    description:
      "Jay and Anthony Stolp, REALTORS® serving Marinette County and the surrounding Northwoods.",
    url: "/northwoods",
    type: "website",
    images: OG_IMAGES,
  },
};

// Swap for a Marinette County aerial when one is shot. This is Lake Superior
// shoreline from the drone portfolio.
const HERO_PHOTO = "/images/services/aerial.jpeg";

const STORY = [
  {
    n: "01",
    title: "Where we grew up",
    body: "We have a deep, personal connection to the Northwoods and the Upper Peninsula. Our history up here spans our entire lives, starting as kids exploring the endless fire lanes and learning to hunt on this very land. We grew up camping back at Morgan Park campground and making epic runs up to Iron Mountain for a KFC feast back when that was a special treat. Today, as adults, we still spend every possible weekend up here, continuing our journey, hiking the trails, finding hidden new spots, and always revisiting the ones we love like Four Seasons and Kremlin Road.",
  },
  {
    n: "02",
    title: "From the ground and air",
    body: "We truly know these forests and backroads from decades of walking and driving them, and in recent years, we have refined our perspective by studying it from the air. Building a specialized drone aerial photography service for local properties allows us to combine lifelong ground level knowledge with a fresh aerial view. We know which shorelines hold the best evening sun and where the most secluded parcels are.",
  },
  {
    n: "03",
    title: "Your place up north",
    body: "We are not just selling a market; we are guiding you in finding a piece of a place we love. We know Marinette County, not from a map, but from a lifetime of being part of it. Let our combined local history and unique aerial perspective work for you as your REALTORS® and as a team, Jay and Anthony, dedicated to helping you find your place in the Northwoods.",
  },
];

const SERVICES = ["Residential", "Lakefront", "Land", "Investment", "Commercial"];

const eyebrow = "text-[11px] font-medium uppercase tracking-[0.38em]";
const sectionHeading =
  "font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.02em]";

export default function NorthwoodsPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden bg-cream text-ink">
        <Nav />

        {/* 1. Hero */}
        <section className="relative flex min-h-[88svh] items-end pt-24">
          <Image
            src={HERO_PHOTO}
            alt="Aerial view of a forested shoreline on clear blue water"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Scrim keeps the headline at AA contrast over any part of the photo. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/10"
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 pb-14 md:px-12 md:pb-20">
            <p className={`${eyebrow} text-cream/80`}>
              Marinette County · Northwoods
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.25rem,7vw,5rem)] font-semibold uppercase leading-[1.02] tracking-[-0.02em] text-cream">
              From the ground and air, we know this land.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-[1.6] text-cream/85 md:text-[19px]">
              This Place Runs Deep in Our Family.
            </p>

            {/* 2. Calls to action */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#search"
                className="group inline-flex items-center justify-center gap-3 border border-cream bg-cream px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-ink transition-all hover:bg-transparent hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Search Northwoods Listings
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
              <a
                href="#team"
                className="inline-flex items-center justify-center gap-3 border border-cream/60 px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-cream transition-all hover:border-cream hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call or Text Us
              </a>
            </div>
          </div>
        </section>

        {/* 3. Story */}
        <section aria-labelledby="story-heading" className="border-b border-ink/10">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
            <h2 id="story-heading" className={sectionHeading}>
              Our story.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-10 md:mt-14 md:grid-cols-3 md:gap-10">
              {STORY.map((s) => (
                <div key={s.n} className="border-t border-ink/15 pt-6">
                  <p className="font-display text-sm font-semibold text-accent">{s.n}</p>
                  <h3 className="mt-2 text-[17px] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink/75">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Listing search */}
        <section
          id="search"
          aria-labelledby="search-heading"
          className="scroll-mt-20 border-b border-ink/10 bg-cream-deep"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
            <p className={`${eyebrow} text-ink-soft/70`}>Active listings</p>
            <h2 id="search-heading" className={`mt-4 ${sectionHeading}`}>
              Search Northwoods listings.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink/75">
              Homes, cabins, lake lots, and land across Marinette County. Drop
              your email and we will send new Northwoods listings the moment they
              hit the MLS.
            </p>
            <div className="mt-8">
              <NorthwoodsSearch />
            </div>
          </div>
        </section>

        {/* 5. Drone callout */}
        <section aria-labelledby="drone-heading" className="bg-ink text-cream">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
            <p className={`${eyebrow} text-cream/65`}>Sellers and land owners</p>
            <h2 id="drone-heading" className={`mt-4 ${sectionHeading}`}>
              See Your Property From Above
            </h2>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-cream/80">
              Selling a home, lake lot, or land? We photograph Northwoods
              properties from the air so buyers see the shoreline, the acreage,
              and the setting the way we do.
            </p>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-cream/15 pt-8 text-[12px] uppercase tracking-[0.24em] text-cream/90">
              {SERVICES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] leading-[1.7] text-cream/70">
              Serving Marinette County and the surrounding Northwoods lakes,
              land, and hometowns.
            </p>
          </div>
        </section>

        {/* 6. Team */}
        <section
          id="team"
          aria-labelledby="team-heading"
          className="scroll-mt-20 border-b border-ink/10"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
            <p className={`${eyebrow} text-ink-soft/70`}>Call or text us</p>
            <h2 id="team-heading" className={`mt-4 ${sectionHeading}`}>
              Jay and Anthony.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {NORTHWOODS_TEAM.map((m) => (
                <TeamCard key={m.name} member={m} />
              ))}
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-ink-soft/70">
              ExSell Experts at Epique Realty
            </p>
          </div>
        </section>

        {/* 7. Contact form */}
        <LeadForm
          source={NORTHWOODS_SOURCES.contact}
          heading={
            <>
              Find your place
              <br />
              up north.
            </>
          }
          intro="Tell us what you are after, a cabin, a lake lot, acreage, or selling what you have. Jay and Anthony both read every message and reply within the day."
        />
        <Footer />
      </main>
    </>
  );
}

function TeamCard({ member: m }: { member: TeamMember }) {
  const tel = telHref(m.phone);
  const sms = tel.replace("tel:", "sms:");
  const action =
    "flex flex-col items-center gap-2 rounded-2xl border border-cream/20 py-4 text-[11px] uppercase tracking-[0.16em] text-cream/90 transition-colors hover:border-cream/50 hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70";
  const initials = m.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <div className="overflow-hidden rounded-[24px] bg-ink text-cream">
      <div className="flex h-56 items-end justify-center bg-gradient-to-b from-sky-400/15 via-ink to-ink px-6 pt-6">
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.photo}
            alt={m.name}
            width={208}
            height={208}
            className="h-52 w-auto object-contain"
          />
        ) : (
          <div
            aria-hidden
            className="mb-4 flex h-40 w-40 items-center justify-center rounded-full border border-cream/20 font-display text-4xl font-semibold tracking-[0.04em] text-cream/70"
          >
            {initials}
          </div>
        )}
      </div>
      <div className="px-6 pb-7 text-center md:px-8">
        <h3 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em]">{m.name}</h3>
        <p className="mt-1 text-[12px] uppercase tracking-[0.24em] text-cream/65">{m.title}</p>
        <a href={tel} className="mt-4 block text-[17px] text-cream hover:underline">
          {m.phone}
        </a>
        <a
          href={`mailto:${m.email}`}
          className="mt-1 block break-all text-[14px] text-cream/75 hover:text-cream hover:underline"
        >
          {m.email}
        </a>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <a href={tel} className={action} aria-label={`Call ${m.name}`}>
            <Phone className="h-5 w-5" aria-hidden />
            Call
          </a>
          <a href={sms} className={action} aria-label={`Text ${m.name}`}>
            <MessageSquare className="h-5 w-5" aria-hidden />
            Text
          </a>
          <a href={`mailto:${m.email}`} className={action} aria-label={`Email ${m.name}`}>
            <Mail className="h-5 w-5" aria-hidden />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
