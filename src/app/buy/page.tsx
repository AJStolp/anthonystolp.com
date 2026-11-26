import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GetAlertsLine } from "@/components/GetAlertsLine";
import { ListingSearchLink } from "@/components/ListingSearchLink";
import { agentJsonLd, brokerageJsonLd } from "@/lib/json-ld";
import { COMMUNITIES } from "@/lib/communities";
import { getActiveDirectory } from "@/lib/niche-pages";
import { OG_IMAGES } from "@/lib/og";

export const revalidate = 3600;

const SITE_URL = "https://anthonystolp.com";

const DESCRIPTION =
  "Buying in Cedarburg, Mequon, Grafton or anywhere in Ozaukee County? Get local advice, new listings first, and a straight answer. Call or text (262) 483-7932.";

export const metadata: Metadata = {
  title: "Buy a Home in Cedarburg and Ozaukee County",
  description: DESCRIPTION,
  alternates: { canonical: "/buy" },
  openGraph: {
    title: "Buy a Home in Cedarburg and Ozaukee County · Anthony Stolp",
    description: DESCRIPTION,
    url: "/buy",
    type: "website",
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy a Home in Cedarburg and Ozaukee County · Anthony Stolp",
    description: DESCRIPTION,
  },
};

const PILLARS = [
  {
    n: "01",
    title: "New listings sent to you",
    body: "New listings sent to you from the MLS as they come on, matched to what you told me you want. When the right one shows up, you hear about it fast and we can see it fast.",
  },
  {
    n: "02",
    title: "A real read on each block",
    body: "I know these towns beyond the listing photos. I'll tell you about traffic, noise, flood maps, and what a home is really worth, and when to walk away.",
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
    a: "Tell me your budget, your must-haves, and your timeframe. I set up a search tailored to you and send live listings as they hit the market. Then we tour the ones worth your time. No pressure and no spam.",
  },
  {
    q: "Do I need to be preapproved before we look?",
    a: "It helps, because it tells us your real budget and makes your offer stronger, but you don't need it to start. We can look first, and I'll point you to honest lenders when you're ready.",
  },
  {
    q: "What areas do you cover?",
    a: "Ozaukee County first: Cedarburg, Mequon, Thiensville, Grafton, Port Washington, and Saukville. I also help buyers in Washington County towns like West Bend, Hartford, and Germantown. If you're looking nearby, just ask.",
  },
];

function shortGeo(geo: string | null): string {
  return (geo ?? "").replace(/,\s*WI$/i, "").trim() || "the area";
}

// The homepage's town order, so both pages list the towns the same way. A
// town the homepage does not list goes last, alphabetically.
function townRank(geo: string | null): number {
  const i = COMMUNITIES.findIndex((c) => c.name === shortGeo(geo));
  return i === -1 ? COMMUNITIES.length : i;
}

export default async function BuyPage() {
  const directory = await getActiveDirectory();
  const areas = directory
    .filter((d) => d.intent === "buy")
    .sort(
      (a, b) =>
        townRank(a.geo) - townRank(b.geo) ||
        shortGeo(a.geo).localeCompare(shortGeo(b.geo)),
    );

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
      agentJsonLd,
      brokerageJsonLd,
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
      <main id="main" className="min-h-dvh bg-white text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />

        <section className="mx-auto flex max-w-3xl flex-col items-start px-6 pt-32 pb-16 md:pt-44 md:pb-24">
          <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/70">
            Buyers
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
            Buying a home in Cedarburg, Ozaukee County, or nearby?
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-[1.7] text-ink-soft/80">
            Tell me your budget and the two or three things you won&apos;t give
            up. I&apos;ll send new listings that fit, tell you what&apos;s wrong
            with each before you tour, and negotiate hard when it counts.
          </p>
          <div className="mt-10">
            <ListingSearchLink
              search="ozaukee-county"
              placement="buy"
              className="inline-flex items-center justify-center border border-ink bg-ink px-8 py-4 text-center text-[12px] uppercase tracking-[0.32em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              See Ozaukee County homes for sale
            </ListingSearchLink>
            {/* /buy has no alerts card of its own, so the line goes to the
                Ozaukee County page's, the same search the button opens. */}
            <GetAlertsLine href="/search/ozaukee-county-homes-for-sale#alerts" />
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
                <span className="font-display text-sm font-semibold text-ink-soft/70">
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
          {/* Many buyers have a home to sell first (T-092). */}
          <p className="mt-10 max-w-xl text-[15px] leading-[1.7] text-ink-soft/80">
            Need to sell first?{" "}
            <Link
              href="/home-value"
              className="underline underline-offset-4 hover:text-ink"
            >
              Find out what your home is worth
            </Link>
            .
          </p>
        </section>

        <Footer />
      </main>
    </>
  );
}
