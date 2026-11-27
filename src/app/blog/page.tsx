import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getAgentProfile } from "@/lib/agent-profile";
import { BLOG_POSTS, blogPostPath, formatPostDate } from "@/lib/blog-posts";
import { AGENT_ID, SITE_URL } from "@/lib/json-ld";
import { OG_IMAGES } from "@/lib/og";
import { telHref } from "@/lib/phone";

const PATH = "/blog";
const PAGE_URL = `${SITE_URL}${PATH}`;
// The layout appends " · Anthony Stolp".
const TITLE = "Cedarburg and Ozaukee Real Estate Blog";
const HEADING = "Cedarburg and Ozaukee County Real Estate Blog";
const DESCRIPTION =
  "Local market updates and practical buying and selling guides for Cedarburg, Ozaukee County and nearby Washington County, WI, from Anthony Stolp.";

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

// The author and publisher are references to the one agent entity the other
// pages define in full (src/lib/json-ld.ts), not a second copy of it.
const agentRef = { "@type": "RealEstateAgent", "@id": AGENT_ID };
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Blog",
      "@id": `${PAGE_URL}#blog`,
      url: PAGE_URL,
      name: HEADING,
      description: DESCRIPTION,
      author: agentRef,
      publisher: agentRef,
      blogPost: BLOG_POSTS.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_URL}${blogPostPath(p.slug)}`,
        datePublished: p.datePublished,
        description: p.description,
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: PAGE_URL },
      ],
    },
  ],
};

const h2 =
  "mt-16 font-display text-2xl font-semibold tracking-[-0.01em] text-ink";
const link = "text-ink underline underline-offset-4";

export default function BlogIndexPage() {
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

          <div className="mt-10 space-y-5 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            <p>
              Straight talk on the local market. I post monthly market updates
              and simple guides for buyers and sellers in Cedarburg, Mequon,
              Grafton, Port Washington, Saukville, Thiensville, and nearby
              Washington County towns like West Bend, Hartford, and Germantown.
            </p>
            <p>
              Every number comes from local sources like Metro MLS and the
              Wisconsin REALTORS Association, and I explain what it actually
              means for you, whether you&apos;re thinking about selling this
              spring or just watching prices.
            </p>
          </div>

          <h2 className={h2}>Latest posts</h2>
          <ul className="mt-6 space-y-6">
            {BLOG_POSTS.map((p) => (
              <li key={p.slug}>
                <article className="rounded-2xl border border-ink/10 p-6">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
                    <Link href={blogPostPath(p.slug)} className="hover:underline underline-offset-4">
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-ink/65">
                    <time dateTime={p.datePublished}>{formatPostDate(p.datePublished)}</time>
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink-soft">
                    {p.description}
                  </p>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-16">
            <NewsletterSignup variant="card" placement="blog" cell={cell} streetCta />
          </div>

          <h2 className={h2}>Have a question about your home or your town?</h2>
          <p className="mt-5 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            Call or text me at{" "}
            <a href={telHref(cell)} className={link}>
              {cell}
            </a>
            , or{" "}
            <Link href="/home-value" className={link}>
              get a free home value estimate
            </Link>
            . I&apos;m a local agent with ExSell Experts | Epique Realty, backed
            by a strong team when you need it.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
