import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getAgentProfile } from "@/lib/agent-profile";
import { AGENT_ID, SITE_URL } from "@/lib/json-ld";
import { STREET_SMS_BODY } from "@/lib/newsletter";
import { getNewsletterIssue, newsletterIssuePath } from "@/lib/newsletter-issues";
import { OG_IMAGES } from "@/lib/og";
import { smsHref, telHref } from "@/lib/phone";

// Issue 1 of The River Report, as published from
// drafts/newsletter-issue-01-dec-2026.md (T-132). The archive copy only: the
// subject, the preheader and each subscriber's zip section belong to the email
// (T-115), and are not on this page.
//
// Title, description and dates come from this issue's entry in the issue list.
const ISSUE = getNewsletterIssue("2026-12");
const PATH = newsletterIssuePath(ISSUE.slug);
const PAGE_URL = `${SITE_URL}${PATH}`;
// The layout appends " · Anthony Stolp".
const TITLE = ISSUE.title;
const DESCRIPTION = ISSUE.description;
const PUBLISHED = ISSUE.datePublished;
const CONTENT_DATE = ISSUE.dateModified;

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
        { "@type": "AdministrativeArea", name: "Ozaukee County, WI" },
        { "@type": "AdministrativeArea", name: "Washington County, WI" },
      ],
      mainEntityOfPage: PAGE_URL,
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Newsletter", item: `${SITE_URL}/newsletter` },
        { "@type": "ListItem", position: 3, name: "December 2026", item: PAGE_URL },
      ],
    },
  ],
};

// The Ozaukee table, as the draft has it. Each row's source is its own column
// because GMAR and WRA count Ozaukee sales differently.
const OZAUKEE_ROWS = [
  ["Homes sold", "103", "95", "up 8.4%", "GMAR (Metro MLS data)"],
  ["Listings", "150", "122", "up 23.0%", "GMAR (Metro MLS data)"],
  ["Median sale price", "$475,000", "$485,950", "down 2.3%", "WRA"],
  ["Months of inventory", "3.8", "3.8", "no change", "WRA"],
  ["Median, year to date", "$505,000", "$479,900", "up 5.2%", "WRA"],
] as const;

const SOURCES = [
  {
    label:
      "Greater Milwaukee Association of REALTORS, “October Home Sales Down 3.5%,” Nov. 13, 2026 (Metro MLS data)",
    href: "https://gmar.com/wp-content/uploads/2026/11/10-31-2026-Housing-Statistics-PR.pdf",
  },
  {
    label:
      "Wisconsin REALTORS Association, October 2026 Wisconsin Real Estate Report (county table, year to date table, mortgage rate)",
    href: "https://www.wra.org/media/afwd3hf0/wisconsin_housing_report_october_2026.pdf",
  },
  {
    label: "Ozaukee Press, “Officials back plan to buy park, add to fairgrounds,” Nov. 24, 2026",
    href: "https://www.ozaukeepress.com/content/officials-back-plan-buy-park-add-fairgrounds",
  },
  {
    label: "Realtor.com, Cedarburg, WI housing market key indicators, November 2026",
    href: "https://www.realtor.com/realestateandhomes-search/Cedarburg_WI/overview",
  },
  {
    label: "Anthony Stolp, Cedarburg Market Update: November 2026",
    href: "/blog/cedarburg-market-nov-2026",
  },
] as const;

const h2 =
  "mt-14 font-display text-2xl font-semibold tracking-[-0.01em] text-ink";
const link = "text-ink underline underline-offset-4";
const th = "py-3 pr-4 text-left text-[11px] font-normal uppercase tracking-[0.2em] text-ink/65";
const td = "py-3 pr-4 align-top";

export default function RiverReportDecember2026Page() {
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
          <p className="text-[11px] uppercase tracking-[0.28em] text-ink/65">
            <Link href="/newsletter" className="hover:underline underline-offset-4">
              The River Report
            </Link>
            , Issue 1
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            {TITLE}
          </h1>

          <div className="mt-10 space-y-5 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            <p className="font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
              103 homes
            </p>
            <p>
              That&apos;s how many homes sold in Ozaukee County in October,
              according to the Greater Milwaukee Association of REALTORS.
              That&apos;s up 8.4% from 95 a year ago, while sales across the
              four county Milwaukee metro fell 3.5%.
            </p>
            <p>
              Hi, I&apos;m Anthony Stolp. Welcome to the first issue of The
              River Report. Once a month I&apos;ll send you what&apos;s
              actually happening in Ozaukee and Washington County real estate:
              a little local news, the numbers that matter, and what they mean
              for your house. Every number has a source. No sales pitch.
            </p>

            <h2 className={h2}>Around the two counties</h2>
            <p>
              <strong className="text-ink">
                Firemen&apos;s Park could soon belong to the county.
              </strong>{" "}
              The county plans to offer the Cedarburg Firemen&apos;s
              Association $2 million, its asking price, for Firemen&apos;s Park
              north of downtown Cedarburg. That&apos;s about 16 acres,
              including the old concrete grandstand. Put together with the
              county&apos;s land next door, it forms the 39 acre site for the
              free county fair every August. The Executive Committee was set to
              take up the resolution on Monday, Nov. 30, and the full County
              Board is expected to vote{" "}
              <strong className="text-ink">Wednesday, Dec. 2</strong>. A county
              memo puts the cost of tearing down the grandstand and improving
              the site at about another $3 million. The fire department told
              the county the land would likely be worth more to a developer,
              but it would rather keep the fair where it is. Nothing is final
              until the board votes, and nobody would guess at a closing date.
              (Ozaukee Press, Nov. 24, 2026)
            </p>
            <p>
              My take: the fair, Maxwell Street Days and a walkable downtown
              are a big part of why people pay up to live in Cedarburg. Keeping
              that land in public hands is good news for the neighborhoods
              around it. I&apos;ll share the result next month.
            </p>
            <p>
              <strong className="text-ink">
                Washington County prices kept climbing.
              </strong>{" "}
              The median sale price in Washington County was $420,000 in
              October, up 10.5% from $380,000 a year earlier. Sales fell to 139
              from 156, and inventory held at 3.6 months. Year to date, the
              median is $419,500, up 8.1%. Fewer homes sold, but the ones that
              did sold for more. If you own in{" "}
              <Link href="/search/west-bend-homes-for-sale" className={link}>
                West Bend
              </Link>
              ,{" "}
              <Link href="/search/hartford-homes-for-sale" className={link}>
                Hartford
              </Link>{" "}
              or{" "}
              <Link href="/search/germantown-homes-for-sale" className={link}>
                Germantown
              </Link>
              , that&apos;s still a good spot to be in. (Wisconsin REALTORS
              Association, October 2026 report)
            </p>

            <h2 className={h2}>The numbers</h2>
            {/* Wider than a phone, so it scrolls sideways there. A region that
                scrolls has to take keyboard focus to be scrolled without a
                pointer, and it is named by the table's caption. */}
            <div
              role="region"
              aria-labelledby="ozaukee-table-caption"
              tabIndex={0}
              className="-mx-6 overflow-x-auto px-6"
            >
              <table className="w-full min-w-[34rem] border-collapse text-[14px] leading-[1.5]">
                <caption id="ozaukee-table-caption" className="pb-3 text-left font-semibold text-ink">
                  Ozaukee County, October 2026
                </caption>
                <thead>
                  <tr className="border-b border-ink/15">
                    <th scope="col" className={th}>
                      <span className="sr-only">Measure</span>
                    </th>
                    <th scope="col" className={`${th} text-right`}>October 2026</th>
                    <th scope="col" className={`${th} text-right`}>October 2025</th>
                    <th scope="col" className={`${th} text-right`}>Change</th>
                    <th scope="col" className={th}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {OZAUKEE_ROWS.map(([label, now, before, change, source]) => (
                    <tr key={label} className="border-b border-ink/10">
                      <th scope="row" className={`${td} text-left font-normal text-ink`}>
                        {label}
                      </th>
                      <td className={`${td} text-right tabular-nums`}>{now}</td>
                      <td className={`${td} text-right tabular-nums`}>{before}</td>
                      <td className={`${td} whitespace-nowrap text-right`}>{change}</td>
                      <td className={td}>{source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Why two sales numbers? GMAR counted 103 Ozaukee sales and WRA
              counted 97. GMAR closes its monthly count on the 10th of the next
              month, so the two reports never line up exactly. Both point the
              same way: more homes are selling in Ozaukee, and more are listed.
            </p>
            <p>
              <strong className="text-ink">Cedarburg right now.</strong>{" "}
              Realtor.com&apos;s Cedarburg numbers for November 2026 show{" "}
              <Link href="/search/cedarburg-homes-for-sale" className={link}>
                56 homes for sale
              </Link>
              , up 26% from a year ago. The median listing price is $499,900,
              down about 15% from a year earlier. Homes are selling in a median
              of 31 days at about 98% of asking. I broke down the rest in my{" "}
              <Link href="/blog/cedarburg-market-nov-2026" className={link}>
                Cedarburg market update for November
              </Link>
              .
            </p>
            <p>
              <strong className="text-ink">Rates.</strong> The 30 year fixed
              rate averaged 7.33% in October, up from 6.25% a year earlier.
              (WRA)
            </p>
            <p>
              <strong className="text-ink">
                What it means if you&apos;re selling.
              </strong>{" "}
              You have more competition than you did a year ago, especially in
              Cedarburg. Price your home to what actually sold nearby, not to
              what a neighbor got last spring. A well priced, well prepped home
              still sells in a few weeks.
            </p>
            <p>
              <strong className="text-ink">
                What it means if you&apos;re buying.
              </strong>{" "}
              You have more to choose from than earlier this year, and
              there&apos;s a little room to negotiate (98% of asking, not
              102%). The good ones still go fast, so get your financing lined
              up before you fall for a house.
            </p>

            <h2 className={h2}>One thing to do this month</h2>
            <p>
              If you&apos;re thinking about selling in the spring, December is
              the easy month to get your number. There are no showings to
              schedule and no rush. I&apos;ll walk through your home, tell you
              what buyers will care about, and what&apos;s worth fixing (and
              what isn&apos;t) before the spring market starts. Start with a{" "}
              <Link href="/home-value" className={link}>
                free home value
              </Link>
              , personally prepared within 24 hours.
            </p>

            <h2 className={h2}>Your street</h2>
            <p>
              Curious what your neighbors&apos; homes actually sold for?{" "}
              <strong className="text-ink">Text me your street</strong> at{" "}
              <a
                href={smsHref(cell, STREET_SMS_BODY)}
                data-placement="newsletter_street_sms"
                className={link}
              >
                {cell}
              </a>{" "}
              and I&apos;ll send what nearby homes sold for. No forms, no spam,
              just the numbers.
            </p>
            <p>
              Rather call?{" "}
              <a
                href={telHref(cell)}
                data-placement="newsletter_street_call"
                className={link}
              >
                {cell}
              </a>
              . Or get a{" "}
              <Link href="/home-value" className={link}>
                free home value
              </Link>
              .
            </p>
            <p>
              Talk soon,
              <br />
              Anthony
            </p>

            <p className="border-t border-ink/10 pt-6 text-[14px] italic">
              The River Report is written by Anthony Stolp, a Realtor with
              ExSell Experts | Epique Realty, serving Ozaukee and Washington
              County. I&apos;m a local agent backed by a strong team, and you
              always work with me. Call or text {cell}.
            </p>

            <h2 className={h2}>Sources</h2>
            <ul className="list-disc space-y-2 pl-5 text-[14px]">
              {SOURCES.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={link}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16">
            <NewsletterSignup variant="card" placement="newsletter_issue" cell={cell} />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
