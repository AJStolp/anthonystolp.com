import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NicheCTA } from "@/components/NicheCTA";
import { getActiveDirectory } from "@/lib/niche-pages";

export const revalidate = 3600;

const SITE_URL = "https://anthonystolp.com";

export const metadata: Metadata = {
  title: "Buy a Home in Southeast Wisconsin",
  description:
    "Find your place in Ozaukee County and the Greater Milwaukee area. Real-time MLS listings, a local read on every block, and honest negotiation from Anthony Stolp.",
  alternates: { canonical: "/buy" },
  openGraph: {
    title: "Buy a Home in Southeast Wisconsin · Anthony Stolp",
    description:
      "Real-time listings, local knowledge, and honest negotiation. Start your home search with Anthony Stolp.",
    url: "/buy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy a Home in Southeast Wisconsin · Anthony Stolp",
    description:
      "Real-time listings, local knowledge, and honest negotiation. Start your home search.",
  },
};

const PILLARS = [
  {
    n: "01",
    title: "Listings the moment they hit",
    body: "You get new homes straight from the MLS as they list, not the stale, days-behind feed the big portals show. When the right one appears, you hear about it first.",
  },
  {
    n: "02",
    title: "A real read on each block",
    body: "I know these neighborhoods, not just the listing photos. I will tell you what a street is actually like, what a home is worth, and when to walk away.",
  },
  {
    n: "03",
    title: "Honest negotiation",
    body: "No pressure and no games. I help you move fast when it counts and hold the line on price, so you buy well and feel good about it.",
  },
];

const FAQS = [
  {
    q: "How do I start a home search with you?",
    a: "Tell me your budget, your must haves, and your timeframe. I set up a search tailored to you and send live listings as they hit the market. Then we tour the ones worth your time. No pressure and no spam.",
  },
  {
    q: "Do I need to be pre-approved before we look?",
    a: "It helps, because it tells us your real budget and makes your offer stronger, but you do not need it to start. We can look first, and I will point you to honest lenders when you are ready.",
  },
  {
    q: "What areas do you cover?",
    a: "Ozaukee County and the Greater Milwaukee area, including Cedarburg, Mequon, Thiensville, Grafton, Port Washington, and Saukville. If you are looking nearby, just ask.",
  },
];

function shortGeo(geo: string | null): string {
  return (geo ?? "").replace(/,\s*WI$/i, "").trim() || "the area";
}

export default async function BuyPage() {
  const directory = await getActiveDirectory();
  const areas = directory
    .filter((d) => d.intent === "buy")
    .sort((a, b) => shortGeo(a.geo).localeCompare(shortGeo(b.geo)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Buy a Home",
            item: `${SITE_URL}/buy`,
          },
        ],
      },
      {
        "@type": "RealEstateAgent",
        name: "Anthony Stolp",
        url: SITE_URL,
        telephone: "+1-262-885-3310",
        areaServed: "Southeast Wisconsin",
        parentOrganization: {
          "@type": "RealEstateOrganization",
          name: "ExSell Experts at Epique Realty",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="min-h-dvh bg-cream text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />

        <section className="mx-auto flex max-w-3xl flex-col items-start px-6 pt-32 pb-16 md:pt-44 md:pb-24">
          <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/60">
            Buyers
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
            Find your place in southeast Wisconsin.
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-[1.7] text-ink-soft/80">
            Real listings the moment they hit, a local read on every block, and
            honest negotiation start to finish. Tell me what you are after and I
            will do the legwork.
          </p>
          <div className="mt-10">
            <NicheCTA intent="buy" slug="buy-hub" />
          </div>
        </section>

        {/* Why buy with me */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
            Why buy with me
          </h2>
          <div className="mt-8 space-y-8">
            {PILLARS.map((p) => (
              <div key={p.n} className="flex gap-5">
                <span className="font-display text-sm font-semibold text-ink-soft/40">
                  {p.n}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-[14px] leading-[1.7] text-ink-soft/75">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Explore by area */}
        {areas.length > 0 ? (
          <section className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Explore by area
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {areas.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/search/${d.slug}`}
                    className="text-[14px] text-ink-soft/75 underline-offset-4 hover:text-ink hover:underline"
                  >
                    Homes for sale in {shortGeo(d.geo)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-12 pb-24">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
            Buyer questions, answered
          </h2>
          <dl className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
            {FAQS.map((f) => (
              <div key={f.q} className="py-6">
                <dt className="text-[15px] font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 max-w-xl text-[14px] leading-[1.7] text-ink-soft/75">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <Footer />
      </main>
    </>
  );
}
