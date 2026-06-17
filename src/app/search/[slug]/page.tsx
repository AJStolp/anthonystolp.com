import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NicheCTA } from "@/components/NicheCTA";
import {
  getActiveBySlug,
  getActiveDirectory,
  getActiveSlugs,
  type NicheDirEntry,
  type NicheIntent,
} from "@/lib/niche-pages";
import { getGeoSnapshot, type GeoSnapshot } from "@/lib/market-data/geo-stats";
import { OG_IMAGES } from "@/lib/og";

export const revalidate = 3600; // ISR: refresh published pages hourly

const SITE_URL = "https://anthonystolp.com";

type RouteParams = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getActiveSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getActiveBySlug(slug);
  if (!page) return { title: "Not found", robots: { index: false } };
  return {
    title: page.title,
    description: page.meta_desc ?? undefined,
    openGraph: {
      title: page.title,
      description: page.meta_desc ?? undefined,
      images: page.og_image ? [{ url: page.og_image }] : OG_IMAGES,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.meta_desc ?? undefined,
      images: page.og_image ? [page.og_image] : OG_IMAGES,
    },
    alternates: { canonical: `/search/${slug}` },
  };
}

// "Cedarburg, WI" -> "Cedarburg"
function shortGeo(geo: string | null): string {
  return (geo ?? "").replace(/,\s*WI$/i, "").trim() || "your area";
}

function usd(n: number | null): string | null {
  if (n == null) return null;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function buildFaqs(
  intent: NicheIntent,
  geoShort: string,
): { q: string; a: string }[] {
  if (intent === "sell") {
    return [
      {
        q: `How much is my home in ${geoShort} worth?`,
        a: `It depends on your home's condition, updates, and exact location, not just the zip code. The snapshot above is a real starting point, and an online estimate gets you in the range. To get an actual number I walk the home, look at what is selling block by block, and price it to the current market. Ask me for a free, no obligation estimate.`,
      },
      {
        q: `How fast are homes selling in ${geoShort}?`,
        a: `Days on market moves with the season and with price. The figure above reflects the latest Redfin window for this area. Homes that are priced right and shown well tend to move faster than the average, and that is the part I focus on with you.`,
      },
      {
        q: `What does it cost to sell with you?`,
        a: `I keep it straightforward and walk you through commission, closing costs, and your likely net before you list, so there are no surprises at the table. No scripts and no pressure. Reach out and I will give you honest numbers for your situation.`,
      },
    ];
  }
  return [
    {
      q: `What do homes cost in ${geoShort}?`,
      a: `Prices vary a lot by neighborhood, lot, and condition, so treat the snapshot above as a baseline rather than a quote. Tell me your budget and must haves and I will send live listings that actually fit, not whatever is trending.`,
    },
    {
      q: `How competitive is the ${geoShort} market?`,
      a: `Inventory and days on market above tell most of the story. When listings are tight, good homes go quickly, so being ready to move matters. I help you act fast when the right one shows up without overpaying for it.`,
    },
    {
      q: `How do I start looking in ${geoShort}?`,
      a: `Tell me what you are after and your timeframe and I will set up a search tailored to you, then we tour the ones worth your time. No pressure and no spam. Start with the search above or just reach out.`,
    },
  ];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/55">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
        {value}
      </p>
    </div>
  );
}

function MarketSnapshot({
  snap,
  geoShort,
}: {
  snap: GeoSnapshot;
  geoShort: string;
}) {
  const price =
    snap.medianPrice != null
      ? usd(snap.medianPrice)
      : snap.medianPriceLow != null && snap.medianPriceHigh != null
        ? `${usd(snap.medianPriceLow)} to ${usd(snap.medianPriceHigh)}`
        : null;

  const tiles: { label: string; value: string }[] = [];
  if (price) tiles.push({ label: "Median sale price", value: price });
  if (snap.medianDom != null)
    tiles.push({ label: "Median days on market", value: `${snap.medianDom}` });
  if (snap.inventory != null)
    tiles.push({ label: "Active listings", value: `${snap.inventory}` });
  if (snap.homesSold != null)
    tiles.push({ label: "Homes sold", value: `${snap.homesSold}` });
  if (snap.yoyPct != null)
    tiles.push({
      label: "Price vs. last year",
      value: `${snap.yoyPct >= 0 ? "+" : ""}${Math.round(snap.yoyPct * 100)}%`,
    });

  if (tiles.length === 0) return null;

  return (
    <section className="mt-16 w-full">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
        {geoShort} market snapshot
      </h2>
      <p className="mt-2 text-[13px] leading-[1.6] text-ink-soft/65">
        Based on Redfin&rsquo;s rolling 90-day data, latest {snap.periodLabel}
        {snap.zipCount > 1 ? `, across ${snap.zipCount} zip codes` : ""}.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} />
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-[1.6] text-ink-soft/50">
        Data from{" "}
        <a
          href="https://www.redfin.com/news/data-center/"
          className="underline underline-offset-2 hover:text-ink-soft/80"
        >
          Redfin Data Center
        </a>
        . Past performance does not predict future results.
      </p>
    </section>
  );
}

function dirLabel(entry: NicheDirEntry): string {
  const g = shortGeo(entry.geo);
  return entry.intent === "sell" ? `${g} home values` : `Homes for sale in ${g}`;
}

export default async function NichePage({ params }: { params: RouteParams }) {
  const { slug } = await params;
  const page = await getActiveBySlug(slug);
  if (!page) notFound();

  const geoShort = shortGeo(page.geo);
  const eyebrow = page.geo ?? (page.intent === "sell" ? "Sellers" : "Buyers");
  const faqs = buildFaqs(page.intent, geoShort);

  const [snap, directory] = await Promise.all([
    getGeoSnapshot(page.geo),
    getActiveDirectory(),
  ]);

  // Same geo, opposite intent — the strongest internal link.
  const crossLink = directory.find(
    (d) => d.geo === page.geo && d.intent !== page.intent,
  );
  // Other areas, same intent — spread ranking authority across the cluster.
  const nearby = directory
    .filter((d) => d.intent === page.intent && d.geo !== page.geo)
    .slice(0, 6);

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
            name: page.h1,
            item: `${SITE_URL}/search/${page.slug}`,
          },
        ],
      },
      {
        "@type": "RealEstateAgent",
        name: "Anthony Stolp",
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image`,
        telephone: "+1-262-885-3310",
        areaServed: page.geo ?? "Southeast Wisconsin",
        address: {
          "@type": "PostalAddress",
          streetAddress: "W193N10980 Kleinmann Dr",
          addressLocality: "Germantown",
          addressRegion: "WI",
          postalCode: "53022",
          addressCountry: "US",
        },
        parentOrganization: {
          "@type": "RealEstateOrganization",
          name: "ExSell Experts at Epique Realty",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-cream text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 md:py-8">
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-[-0.01em] text-ink"
        >
          Anthony Stolp
        </Link>
        <Link
          href="/#contact"
          className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/70 underline-offset-4 hover:underline"
        >
          Contact
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-start px-6 py-16 md:py-28">
        <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/60">
          {eyebrow}
        </p>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
          {page.h1}
        </h1>
        {page.hero_copy ? (
          <p className="mt-8 max-w-xl text-[15px] leading-[1.7] text-ink-soft/80">
            {page.hero_copy}
          </p>
        ) : null}
        <div className="mt-10">
          <NicheCTA intent={page.intent} slug={page.slug} />
        </div>

        {snap ? <MarketSnapshot snap={snap} geoShort={geoShort} /> : null}

        {/* FAQ */}
        <section className="mt-16 w-full">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
            {geoShort} questions, answered
          </h2>
          <dl className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
            {faqs.map((f) => (
              <div key={f.q} className="py-6">
                <dt className="text-[15px] font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 max-w-xl text-[14px] leading-[1.7] text-ink-soft/75">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Internal links */}
        {crossLink || nearby.length > 0 ? (
          <section className="mt-16 w-full">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Keep exploring
            </h2>
            {crossLink ? (
              <p className="mt-6 text-[15px] leading-[1.7] text-ink-soft/80">
                {page.intent === "sell" ? (
                  <Link
                    href={`/search/${crossLink.slug}`}
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    Browse homes for sale in {geoShort}
                  </Link>
                ) : (
                  <Link
                    href={`/search/${crossLink.slug}`}
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    See what your {geoShort} home is worth
                  </Link>
                )}
              </p>
            ) : null}
            {nearby.length > 0 ? (
              <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {nearby.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/search/${d.slug}`}
                      className="text-[14px] text-ink-soft/75 underline-offset-4 hover:text-ink hover:underline"
                    >
                      {dirLabel(d)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <div className="mt-16 border-t border-ink/10 pt-8 text-[12px] leading-[1.6] text-ink-soft/65">
          <p>
            Anthony Stolp, ExSell Experts at Epique Realty. Honest pricing,
            real staging, no scripts. Greater Milwaukee, southeast Wisconsin.
          </p>
          <p className="mt-2">
            WI License #114204-94. Brokerage: (262) 885-3310.
          </p>
        </div>
      </section>
    </main>
  );
}
