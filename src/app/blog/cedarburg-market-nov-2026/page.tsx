import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAgentProfile } from "@/lib/agent-profile";
import { blogPostPath, getBlogPost } from "@/lib/blog-posts";
import { AGENT_ID, SITE_URL } from "@/lib/json-ld";
import { OG_IMAGES } from "@/lib/og";
import { telHref } from "@/lib/phone";

// Title, description and dates come from this post's entry in the post list.
const POST = getBlogPost("cedarburg-market-nov-2026");
const PATH = blogPostPath(POST.slug);
const PAGE_URL = `${SITE_URL}${PATH}`;
const TITLE = POST.title;
const DESCRIPTION = POST.description;
const PUBLISHED = POST.datePublished;
const CONTENT_DATE = POST.dateModified;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    url: PATH,
    publishedTime: PUBLISHED,
    modifiedTime: CONTENT_DATE,
    images: OG_IMAGES,
  },
};

// The author is a reference to the one agent entity the other pages define in
// full (src/lib/json-ld.ts), not a second copy of it.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${PAGE_URL}#article`,
      headline: TITLE,
      description: DESCRIPTION,
      datePublished: PUBLISHED,
      dateModified: CONTENT_DATE,
      author: { "@type": "RealEstateAgent", "@id": AGENT_ID },
      about: [
        { "@type": "City", name: "Cedarburg, WI" },
        { "@type": "AdministrativeArea", name: "Ozaukee County, WI" },
      ],
      mainEntityOfPage: PAGE_URL,
    },
  ],
};

const h2 =
  "mt-12 font-display text-2xl font-semibold tracking-[-0.01em] text-ink";
const link = "text-ink underline underline-offset-4";

export default function CedarburgMarketNov2026Page() {
  const cell = getAgentProfile().mobilePhone;
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
        <article className="mx-auto max-w-2xl px-6 pt-32 pb-24 md:pt-44">
          <h1 className="font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            {TITLE}
          </h1>

          <div className="mt-10 space-y-5 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            <p>
              I&apos;m Anthony Stolp, a Realtor with ExSell Experts | Epique
              Realty. I work Cedarburg and the rest of Ozaukee County every
              week, and I have a strong team behind me when a deal needs extra
              hands. You still work with me, start to finish. Official November
              closings are not out yet, so this update uses the latest October
              reports plus a mid November look at what is listed in town right
              now.
            </p>

            <h2 className={h2}>What the numbers say</h2>
            <p>
              Realtor.com&apos;s Cedarburg key indicators, as of November 2026,
              put the median listing price at $499,900, down 6.11% from the
              prior month and 15.26% from a year earlier. There were 56 active
              listings, up 35.90% from the prior month and 26.19% from a year
              earlier. The median time a listing had been on the market was 31
              days, shorter than the prior month but 40.91% longer than a year
              earlier. Homes that sold were coming in at 98% of asking, or
              about 1.53% below the list price, and the median sold price was
              $508,000.
            </p>
            <p>
              A November 5, 2026 update by Dillon Kanitz-Reed of Coldwell
              Banker Realty, based on Metro MLS statistics for Cedarburg, fills
              in October&apos;s closed sales. Sixteen homes sold, 27 new
              listings came on, and 40 homes were available, or 2.5 months of
              supply compared with 1.47 months year to date. The median sale
              price was $497,950, compared with $576,390 year to date. Homes
              that closed spent an average of 24 days on the market and sold
              for 99.59% of list price, compared with 102.02% year to date.
              With only 16 sales, a softer October median is not proof that
              every Cedarburg home lost value.
            </p>
            <p>
              Zillow&apos;s Home Value Index for Cedarburg, updated October 31,
              2026, was $558,988, up 6.4% over the prior year. That is an
              estimate of typical values, not a median of last month&apos;s
              sales.
            </p>
            <p>
              Countywide, the Wisconsin REALTORS Association October 2026
              report, released November 19, is the official statewide series I
              trust for Ozaukee County. In October, the median sale price was
              $475,000, down 2.3% from $485,950 a year earlier. Sales were 97,
              compared with 98. Months of inventory held at 3.8. Year to date
              through October, the median was $505,000, up 5.2% from $479,900,
              and sales were 1,043, up 11.8% from 933.
            </p>
            <p>
              The Greater Milwaukee Association of REALTORS, using Metro MLS
              data in its November 13, 2026 release, counted Ozaukee a little
              differently (monthly totals are cut off on the 10th of the
              following month): 103 October sales, up 8.4% from 95, and 150
              listings, up 23.0% from 122. Metro MLS Monthly Metrics for
              October put the four county median (Milwaukee, Ozaukee,
              Washington, and Waukesha) at $374,030, up 1.4%, with 2.6 months
              of supply and 98.2% of original list price received. The same WRA
              report puts the average 30 year fixed mortgage rate at 7.33% in
              October 2026, up from 6.25% in October 2025.
            </p>

            <h2 className={h2}>What it means for sellers</h2>
            <p>
              This is not a market where you can pick a number and wait. Buyers
              have more homes to walk through than they did a year ago, and
              October closings came in a hair under asking after a year to date
              stretch above it. Pricing has to be honest, tied to what actually
              sold nearby, not to last spring&apos;s headlines. A well
              prepared, well priced home can still move in a few weeks. A home
              priced for a hotter month will sit, and sitting is what starts the
              price cuts.
            </p>

            <h2 className={h2}>What it means for buyers</h2>
            <p>
              You have more choices than you did earlier this year. Compare the{" "}
              <Link href="/search/cedarburg-homes-for-sale" className={link}>
                homes for sale in Cedarburg
              </Link>
              , look at how long a home has been listed, and do not be shy about
              asking for repairs or a credit when the condition or the price is
              off. The 98% sale to list figure from Realtor.com for November,
              and the 99.59% Metro MLS figure for October in Cedarburg, both
              say there is a little room to talk. That is not an invitation to
              lowball a sharp listing and hope it sits. Good homes in the
              Cedarburg School District still go quickly. A 7.33% average 30
              year fixed rate in October is a real headwind. If you find the
              right house, talk with your lender about the payment today and
              what a later refinance would look like.
            </p>

            <h2 className={h2}>A note on winter timing</h2>
            <p>
              Cedarburg gets quieter after the holidays, and that is not a bad
              time to buy or to get a home ready to list in late winter. If you
              need to move before spring, a winter listing can still work. The
              WRA&apos;s Tom Larson noted in the October report that sellers who
              list in the colder months tend to be more motivated, which can
              mean more room on the final price. The flip side is that a sharp,
              well presented listing has less competition in December than it
              will in April. If you want to be on the market when spring buyers
              show up, January and February are when we should talk about prep,
              pricing, and photos.
            </p>

            <h2 className={h2}>How I can help</h2>
            <p>
              If you want a straight read on your Cedarburg home, start with a{" "}
              <Link href="/home-value" className={link}>
                free home value estimate
              </Link>
              , or call or text me at{" "}
              <a href={telHref(cell)} className={link}>
                {cell}
              </a>
              . If you are{" "}
              <Link href="/buy" className={link}>
                buying
              </Link>
              , I can set up new listing alerts and tell you what is wrong with a
              house before I tell you what is right.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
