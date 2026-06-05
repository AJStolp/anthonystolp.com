import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HomeValueFunnel } from "@/components/HomeValueFunnel";
import { HOME_VALUE_ENABLED, SELL_FALLBACK_HREF } from "@/lib/feature-flags";

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
  },
};

export default function HomeValuePage() {
  // Funnel is gated until bndryiq is production-ready. Visitors who arrive
  // via stale links land on the contact form with intent=sell prefilled,
  // so we still capture the lead.
  if (!HOME_VALUE_ENABLED) redirect(SELL_FALLBACK_HREF);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden">
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
