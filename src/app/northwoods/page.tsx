import type { Metadata } from "next";
import Image from "next/image";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Nav } from "@/components/Nav";
import { LeadForm } from "@/components/LeadForm";
import { Footer } from "@/components/Footer";
import { NorthwoodsSearch } from "@/components/NorthwoodsSearch";
import { NORTHWOODS_SOURCES } from "@/lib/northwoods";
import { getAgentProfile } from "@/lib/agent-profile";
import { telHref } from "@/lib/phone";

// Landing page for the printed Marinette County flyer. The QR code points at
// /northwoods?utm_source=flyer&utm_medium=print&utm_campaign=northwoods, which
// the site's existing attribution records on every lead from this page.

const SITE_URL = "https://anthonystolp.com";
const PAGE_URL = `${SITE_URL}/northwoods`;

const TITLE = "Marinette County Land and Cabins · Jay and Anthony Stolp";
const DESCRIPTION =
  "Rural land with no address, just coordinates? We will get back there, walk it, fly it, and market it right. Land, cabins, and lake homes across Marinette County, WI.";
const OG_IMAGE = {
  url: "/images/northwoods/og-pembine.jpg",
  width: 1200,
  height: 630,
  alt: "Aerial view of a river winding through fall forest near Pembine, Marinette County",
};

export const metadata: Metadata = {
  // Absolute: the root template would append "· Anthony Stolp" a second time.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/northwoods" },
  openGraph: {
    title: "From the ground and air, we know this land.",
    description: DESCRIPTION,
    url: "/northwoods",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "From the ground and air, we know this land.",
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

// The one contact on the page, the same as everywhere else on the site.
const CONTACT = {
  name: "Anthony Stolp",
  title: "REALTOR®",
  phone: getAgentProfile().mobilePhone,
  email: "anthony@exsellexperts.com",
  photo: "/images/anthony-headshot.png",
};

// Drone shot of the river corridor near Pembine, Marinette County.
const HERO_PHOTO = "/images/northwoods/hero-pembine.jpg";

const STORY = [
  {
    n: "01",
    title: "Where we grew up",
    body: "We have a deep, personal connection to the Northwoods and the Upper Peninsula. Our history up here spans our entire lives, starting as kids exploring the endless fire lanes and learning to hunt on this very land. We grew up camping back at Morgan Park campground and making epic runs up to Iron Mountain for a KFC feast back when that was a special treat. Today, as adults, we still spend every possible weekend up here, hiking the trails, finding new spots, and going back to the ones we love like Four Seasons and Kremlin Road.",
  },
  {
    n: "02",
    title: "From the ground and air",
    body: "We know these forests and backroads from decades of walking and driving them, and lately from flying them too. Our drone work lets us show buyers what we already know from the ground. We know which shorelines hold the best evening sun and where the most secluded parcels are.",
  },
  {
    n: "03",
    title: "Your place up north",
    body: "We're not selling a market from a map. We're helping you find a piece of a place we love. We know Marinette County from a lifetime of being part of it. Put that history, and the view from the drone, to work on your search or your sale.",
  },
];

const SERVICES = ["Residential", "Lakefront", "Land", "Investment", "Commercial"];

// Wisconsin only. The Upper Peninsula stays in the story until both hold
// Michigan licenses.
const TOWNS = [
  "Pembine",
  "Wausaukee",
  "Crivitz",
  "Amberg",
  "Marinette",
  "Peshtigo",
  "Coleman",
  "Porterfield",
];
const WATERS = ["High Falls", "Caldron Falls", "Lake Noquebay"];

// "a, b, and c", the way the copy names places.
function listOf(items: string[]): string {
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

const LAND_STEPS = [
  {
    title: "We find it",
    body: "Coordinates, a parcel number, or a fire lane and a landmark. If you can point to it on a map, we will get back there.",
  },
  {
    title: "We shoot it right",
    body: "We walk the land and fly it. Ground photos and drone aerials that show the timber, the trails, the water, and how the whole parcel lays out.",
  },
  {
    title: "We market it properly",
    body: "A listing that shows buyers what is actually worth the drive, in front of the people looking for exactly this kind of place.",
  },
];

// Rendered on the page and emitted as FAQPage JSON-LD from the same array, so
// the structured data can never say something the page does not.
const FAQS = [
  {
    q: "Can you sell land that has no address, only GPS coordinates?",
    a: "Yes. A lot of rural land in Marinette County has no street address, no driveway, and no mailbox. Send me the coordinates or the parcel number and we will find it, walk it, and photograph it from the ground and the air.",
  },
  {
    q: "Do you take drone photos of land and lake property?",
    a: "Yes. Drone aerials alongside ground photos are how we market land and lake property, so buyers see the acreage, the shoreline, and the setting before they ever make the drive.",
  },
  {
    q: "My land sat on the market with bad photos. Can you relist it?",
    a: "Yes, once that listing has expired or been withdrawn. We will come out, reshoot it properly from the ground and the air, and put it back on the market the right way.",
  },
  {
    q: "What areas of the Northwoods do you cover?",
    a: `Marinette County, Wisconsin, including ${listOf(TOWNS)}, plus lake and river property on ${listOf(WATERS)}.`,
  },
  {
    q: "Can you help us buy a cabin or hunting land up north?",
    a: "Yes. We spend most weekends up here and know the backroads, the lakes, and the parcels that don't come up often. Tell me what you're after and I'll send listings as they hit the MLS.",
  },
];

const areaServed = [
  { "@type": "AdministrativeArea", name: "Marinette County, Wisconsin" },
  ...TOWNS.map((t) => ({ "@type": "City", name: `${t}, Wisconsin` })),
];

// The home page's id, so search engines read one person.
const AGENT_ID = `${SITE_URL}/#agent`;

const brokerage = {
  "@type": "RealEstateOrganization",
  name: getAgentProfile().brokerage,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      primaryImageOfPage: `${SITE_URL}${OG_IMAGE.url}`,
    },
    {
      "@type": "RealEstateAgent",
      "@id": AGENT_ID,
      name: CONTACT.name,
      jobTitle: CONTACT.title,
      telephone: `+1-${CONTACT.phone.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}`,
      email: CONTACT.email,
      image: `${SITE_URL}${CONTACT.photo}`,
      url: PAGE_URL,
      worksFor: brokerage,
      areaServed,
    },
    {
      "@type": "Service",
      "@id": `${PAGE_URL}#aerial-photography`,
      name: "Drone aerial photography for land and lake property",
      serviceType: "Real estate aerial photography",
      provider: { "@id": AGENT_ID },
      areaServed,
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const eyebrow = "text-[11px] font-medium uppercase tracking-[0.38em]";
const sectionHeading =
  "font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.02em]";

export default function NorthwoodsPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden bg-white text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />

        {/* 1. Hero */}
        <section className="relative flex min-h-[88svh] items-end pt-24">
          <Image
            src={HERO_PHOTO}
            alt="Aerial view of a river winding through fall forest near Pembine, Marinette County"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Scrim keeps the headline at AA contrast over any part of the photo. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/60 to-ink/55"
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 pb-14 md:px-12 md:pb-20">
            <p className="inline-block bg-ink/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white md:tracking-[0.38em]">
              Marinette County · Northwoods
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.25rem,7vw,5rem)] font-semibold uppercase leading-[1.02] tracking-[-0.02em] text-white">
              From the ground and air, we know this land.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-[1.6] text-white md:text-[19px]">
              This place runs deep in our family.
            </p>

            {/* 2. Calls to action */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <NorthwoodsSearch
                kind="land"
                label="Search Northwoods land"
                className="group inline-flex items-center justify-center gap-3 border border-white bg-white px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-ink transition-all hover:bg-transparent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              />
              <a
                href="#team"
                className="inline-flex items-center justify-center gap-3 border border-white/60 px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-white transition-all hover:border-white hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call or Text Me
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
                  <p className="font-display text-sm font-semibold text-ink/65">{s.n}</p>
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
            <p className={`${eyebrow} text-ink/70`}>Active listings</p>
            <h2 id="search-heading" className={`mt-4 ${sectionHeading}`}>
              Search Northwoods listings.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink/75">
              Homes, cabins, lake lots, and land across Marinette County. Drop
              your email and I will send new Northwoods listings the moment they
              hit the MLS.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <NorthwoodsSearch kind="homes" label="See homes and cabins" />
              <NorthwoodsSearch kind="land" label="See land" />
            </div>
          </div>
        </section>

        {/* 5. Drone callout */}
        <section aria-labelledby="drone-heading" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
            <p className={`${eyebrow} text-white/65`}>Sellers and land owners</p>
            <h2 id="drone-heading" className={`mt-4 ${sectionHeading}`}>
              See your property from above.
            </h2>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-white/80">
              Selling a home, lake lot, or land? We photograph Northwoods
              properties from the air so buyers see the shoreline, the acreage,
              and the setting the way we do.
            </p>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-8 text-[12px] uppercase tracking-[0.24em] text-white/90">
              {SERVICES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] leading-[1.7] text-white/70">
              Serving Marinette County and the surrounding Northwoods lakes,
              land, and hometowns.
            </p>
          </div>
        </section>

        {/* Rural land: the thing that sets them apart, and what land owners search for. */}
        <section
          id="land"
          aria-labelledby="land-heading"
          className="scroll-mt-20 border-b border-ink/10"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
            <p className={`${eyebrow} text-ink-soft/70`}>Rural land and acreage</p>
            <h2 id="land-heading" className={`mt-4 max-w-3xl ${sectionHeading}`}>
              No address? Just coordinates? We will get back there.
            </h2>
            <div className="mt-6 max-w-2xl space-y-5 text-[16px] leading-[1.75] text-ink/75">
              <p>
                A lot of the best land in Marinette County has no driveway, no
                mailbox, and no street number. Send me the GPS coordinates or the
                parcel number and we will find it, walk it, and fly it, so buyers
                see the real thing instead of a blurry shot from the road.
              </p>
              <p>
                Had an agent who snapped a few phone pictures from the ditch and
                called it marketing? We got you.
              </p>
            </div>
            <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
              {LAND_STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-ink/15 pt-6">
                  <p className="font-display text-sm font-semibold text-ink/65">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-[17px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink/75">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-12 max-w-3xl text-[14px] leading-[1.7] text-ink/70">
              Land, cabins, and lake homes in {listOf(TOWNS)}, and on the water at{" "}
              {listOf(WATERS)}.
            </p>
            <a
              href="#contact"
              className="group mt-8 inline-flex w-full items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
            >
              Tell me about your land
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </section>

        {/* 6. Team */}
        <section
          id="team"
          aria-labelledby="team-heading"
          className="scroll-mt-20 border-b border-ink/10"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
            <p className={`${eyebrow} text-ink-soft/70`}>Call or text me</p>
            <h2 id="team-heading" className={`mt-4 ${sectionHeading}`}>
              Anthony Stolp.
            </h2>
            <div className="mt-10 max-w-md">
              <ContactCard />
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-ink-soft/70">
              {getAgentProfile().brokerage}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="border-b border-ink/10 bg-cream-deep">
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <h2 id="faq-heading" className={sectionHeading}>
              Questions land owners ask me.
            </h2>
            <dl className="mt-8 divide-y divide-ink/10 border-t border-ink/10">
              {FAQS.map((f) => (
                <div key={f.q} className="py-6">
                  <dt className="text-[16px] font-semibold text-ink">{f.q}</dt>
                  <dd className="mt-2 text-[15px] leading-[1.75] text-ink/75">{f.a}</dd>
                </div>
              ))}
            </dl>
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
          intro="Tell me what you're after: a cabin, a lake lot, acreage, or selling what you have. I read every message and reply within the day."
          cell={getAgentProfile().mobilePhone}
          messagePlaceholder="Township, lake, acreage, timing, anything on your mind."
        />
        <Footer
          wordmark="NORTHWOODS"
          tagline={`Cousins Jay and Anthony Stolp, REALTORS® · ${getAgentProfile().brokerage}`}
        />
      </main>
    </>
  );
}

function ContactCard() {
  const m = CONTACT;
  const tel = telHref(m.phone);
  const sms = tel.replace("tel:", "sms:");
  const action =
    "flex flex-col items-center gap-2 rounded-2xl border border-white/20 py-4 text-[11px] uppercase tracking-[0.16em] text-white/90 transition-colors hover:border-white/50 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div className="overflow-hidden rounded-[24px] bg-ink text-white">
      <div className="flex h-56 items-end justify-center bg-gradient-to-b from-sky-400/15 via-ink to-ink px-6 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.photo}
          alt={m.name}
          width={208}
          height={208}
          className="h-52 w-auto object-contain"
        />
      </div>
      <div className="px-6 pb-7 text-center md:px-8">
        <h3 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em]">{m.name}</h3>
        <p className="mt-1 text-[12px] uppercase tracking-[0.24em] text-white/65">{m.title}</p>
        <a href={tel} className="mt-4 block text-[17px] text-white hover:underline">
          {m.phone}
        </a>
        <a
          href={`mailto:${m.email}`}
          className="mt-1 block break-all text-[14px] text-white/75 hover:text-white hover:underline"
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
