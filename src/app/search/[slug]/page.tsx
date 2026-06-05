import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NicheCTA } from "@/components/NicheCTA";
import { getActiveBySlug, getActiveSlugs } from "@/lib/niche-pages";

export const revalidate = 3600; // ISR: refresh published pages hourly

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
      images: page.og_image ? [{ url: page.og_image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.meta_desc ?? undefined,
      images: page.og_image ? [page.og_image] : undefined,
    },
    alternates: { canonical: `/search/${slug}` },
  };
}

export default async function NichePage({ params }: { params: RouteParams }) {
  const { slug } = await params;
  const page = await getActiveBySlug(slug);
  if (!page) notFound();

  const eyebrow = page.geo ?? (page.intent === "sell" ? "Sellers" : "Buyers");

  return (
    <main className="min-h-dvh bg-cream text-ink">
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
