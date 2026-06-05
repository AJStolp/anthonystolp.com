import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { NichePageForm } from "@/components/admin/NichePageForm";
import { getBySlug } from "@/lib/niche-pages";

export const metadata: Metadata = {
  title: "Edit niche page",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

export default async function EditNichePage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const page = await getBySlug(slug);
  if (!page) notFound();

  const filters = page.filters ?? {};

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-4 pb-3">
          <AdminNavLinks current="pages" />
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/60 underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
              Admin / Pages
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Edit{" "}
              <span className="font-mono text-xl">/search/{page.slug}</span>
            </h1>
          </div>
          <Link
            href="/admin/pages"
            className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/70 hover:text-ink"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <NichePageForm
          mode="edit"
          slug={page.slug}
          initial={{
            slug: page.slug,
            title: page.title,
            h1: page.h1,
            intent: page.intent,
            geo: page.geo ?? "",
            hero_copy: page.hero_copy ?? "",
            meta_desc: page.meta_desc ?? "",
            og_image: page.og_image ?? "",
            filters_min_price: filters.minPrice?.toString() ?? "",
            filters_max_price: filters.maxPrice?.toString() ?? "",
            filters_beds: filters.beds?.toString() ?? "",
            active: page.active,
          }}
        />
      </div>
    </main>
  );
}
