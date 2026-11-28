import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getAgentProfile } from "@/lib/agent-profile";
import { formatPostDate } from "@/lib/blog-posts";
import { AGENT_ID, SITE_URL } from "@/lib/json-ld";
import { NEWSLETTER_NAME } from "@/lib/newsletter";
import { NEWSLETTER_ISSUES, newsletterIssuePath } from "@/lib/newsletter-issues";
import { OG_IMAGES } from "@/lib/og";

// The River Report archive (T-132): every issue, newest first, with the signup
// card at the top so a reader who likes what they see can get the next one.
const PATH = "/newsletter";
const PAGE_URL = `${SITE_URL}${PATH}`;
// The layout appends " · Anthony Stolp".
const TITLE = `${NEWSLETTER_NAME} Newsletter Archive`;
const HEADING = NEWSLETTER_NAME;
const DESCRIPTION =
  "Every issue of The River Report, Anthony Stolp's monthly email on Ozaukee and Washington County real estate: local news, sourced numbers, what they mean.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: PATH,
    images: OG_IMAGES,
  },
};

const agentRef = { "@type": "RealEstateAgent", "@id": AGENT_ID };
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${PAGE_URL}#archive`,
      url: PAGE_URL,
      name: HEADING,
      description: DESCRIPTION,
      author: agentRef,
      hasPart: NEWSLETTER_ISSUES.map((i) => ({
        "@type": "Article",
        headline: i.title,
        url: `${SITE_URL}${newsletterIssuePath(i.slug)}`,
        datePublished: i.datePublished,
        description: i.description,
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Newsletter", item: PAGE_URL },
      ],
    },
  ],
};

const h2 =
  "mt-16 font-display text-2xl font-semibold tracking-[-0.01em] text-ink";

export default function NewsletterArchivePage() {
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
        <div className="mx-auto max-w-2xl px-6 pt-32 pb-24 md:pt-44">
          <h1 className="font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            {HEADING}
          </h1>
          <p className="mt-8 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            Once a month I send what&apos;s actually happening in Ozaukee and
            Washington County real estate: a little local news, the numbers
            that matter, and what they mean for your house. Every number has a
            source. Every past issue is below.
          </p>

          <div className="mt-12">
            <NewsletterSignup variant="card" placement="newsletter_archive" cell={cell} />
          </div>

          <h2 className={h2}>Past issues</h2>
          <ul className="mt-6 space-y-6">
            {NEWSLETTER_ISSUES.map((i) => (
              <li key={i.slug}>
                <article className="rounded-2xl border border-ink/10 p-6">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
                    <Link href={newsletterIssuePath(i.slug)} className="hover:underline underline-offset-4">
                      {i.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-ink/65">
                    <time dateTime={i.datePublished}>{formatPostDate(i.datePublished)}</time>
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink-soft">
                    {i.description}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
