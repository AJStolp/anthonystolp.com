import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAgentProfile } from "@/lib/agent-profile";
import { BLOG_POSTS, blogPostPath } from "@/lib/blog-posts";
import { NEWSLETTER_NAME } from "@/lib/newsletter";
import { telHref } from "@/lib/phone";

// Where the River Report confirm link lands once it has worked (T-113). Only
// someone who clicked a confirm link has a reason to be here, so it stays out
// of search and the sitemap, and it carries no signup: they just signed up.
// "See the latest issue" joins the copy once an issue page exists (T-115).
export const metadata: Metadata = {
  title: `You're on the list for ${NEWSLETTER_NAME}`,
  robots: { index: false, follow: false },
};

const link = "text-ink underline underline-offset-4";

export default function NewsletterConfirmedPage() {
  const cell = getAgentProfile().mobilePhone;
  const marketPost = BLOG_POSTS.find((p) => p.slug === "cedarburg-market-nov-2026");
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="min-h-dvh bg-white text-ink">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 pt-32 pb-24 md:pt-44">
          <h1 className="font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            You&apos;re on the list.
          </h1>
          <p className="mt-8 text-[15px] leading-[1.75] text-ink-soft md:text-[16px]">
            {NEWSLETTER_NAME} goes out the first Tuesday of the month. While
            you&apos;re here,{" "}
            {marketPost ? (
              <Link href={blogPostPath(marketPost.slug)} className={link}>
                read the Cedarburg market update
              </Link>
            ) : (
              "read the Cedarburg market update"
            )}
            , or{" "}
            <Link href="/home-value" className={link}>
              get a free home value
            </Link>
            . Questions? Call or text me at{" "}
            <a href={telHref(cell)} data-placement="newsletter_confirmed" className={link}>
              {cell}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
