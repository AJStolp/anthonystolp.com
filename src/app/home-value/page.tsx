import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HomeValueFunnel } from "@/components/HomeValueFunnel";
import { HOME_VALUE_ENABLED, sellFallbackHref } from "@/lib/feature-flags";
import { OG_IMAGES } from "@/lib/og";

export const metadata: Metadata = {
  title: "What's your home worth?",
  description:
    "Free, personalized home value estimate for southeast Wisconsin homes. An honest range, emailed to you within 24 hours by Anthony Stolp.",
  alternates: { canonical: "/home-value" },
  openGraph: {
    title: "What's your home worth? · Anthony Stolp",
    description:
      "Free, personalized home value estimate. An honest range, emailed within 24 hours.",
    url: "/home-value",
    images: OG_IMAGES,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

// The address a seller typed, and the campaign they came from, have to survive
// the redirect: LeadForm puts the address in its message and captureAttribution
// reads utm_* from the landing URL.
function fallbackParams(query: SearchParams): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value !== "string" || !value.trim()) continue;
    if (key === "address" || key.startsWith("utm_")) kept[key] = value;
  }
  return kept;
}

export default async function HomeValuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Funnel is gated until bndryiq is production-ready. Visitors who arrive
  // via stale links land on the contact form with intent=sell prefilled,
  // so we still capture the lead. searchParams is read only on this branch:
  // reading it makes the page dynamic, and the live funnel stays static.
  if (!HOME_VALUE_ENABLED) {
    redirect(sellFallbackHref(fallbackParams(await searchParams)));
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden">
        <h1 className="sr-only">
          Free home value estimate for southeast Wisconsin homes
        </h1>
        <Nav />
        {/* HomeValueFunnel reads URL params via useSearchParams for the hero
            pre-fill flow. That triggers CSR bailout under static rendering,
            so wrap in Suspense per Next's prerender contract. */}
        <Suspense fallback={<div className="min-h-[80vh]" aria-hidden />}>
          <HomeValueFunnel />
        </Suspense>
        <Footer />
      </main>
    </>
  );
}
