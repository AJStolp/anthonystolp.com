import type { Metadata } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HomeValueFunnel } from "@/components/HomeValueFunnel";
import { getAgentProfile } from "@/lib/agent-profile";
import { BNDRYIQ_LIVE } from "@/lib/home-value";
import {
  AGENT_ID,
  SITE_URL,
  WEBSITE_ID,
  agentJsonLd,
  brokerageJsonLd,
} from "@/lib/json-ld";
import { OG_IMAGES } from "@/lib/og";
import { telHref } from "@/lib/phone";

const DESCRIPTION =
  "Free home value for Cedarburg, Ozaukee County, and nearby Washington County. An honest range from Anthony Stolp, sent within 24 hours.";

export const metadata: Metadata = {
  title: "What's your home worth?",
  description: DESCRIPTION,
  alternates: { canonical: "/home-value" },
  openGraph: {
    title: "What's your home worth? · Anthony Stolp",
    description: DESCRIPTION,
    url: "/home-value",
    images: OG_IMAGES,
  },
};

const PAGE_URL = `${SITE_URL}/home-value`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    agentJsonLd,
    brokerageJsonLd,
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      name: "What's your home worth?",
      description: DESCRIPTION,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": `${PAGE_URL}#service` },
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
    },
    {
      "@type": "Service",
      "@id": `${PAGE_URL}#service`,
      name: "Free home value estimate",
      serviceType: "Home valuation",
      description:
        "An honest price range for your home based on what is actually selling nearby, emailed within 24 hours. No algorithm guess, no pressure.",
      provider: { "@id": AGENT_ID },
      areaServed: [
        "Cedarburg, WI",
        "Mequon, WI",
        "Thiensville, WI",
        "Grafton, WI",
        "Port Washington, WI",
        "Saukville, WI",
        "Ozaukee County, WI",
        "West Bend, WI",
        "Hartford, WI",
        "Germantown, WI",
        "Jackson, WI",
        "Slinger, WI",
      ],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Home value", item: PAGE_URL },
      ],
    },
  ],
};

// The heading and intro are rendered here, on the server, so they are in the
// HTML Google fetches. Only the form waits on the browser: it reads an address
// typed elsewhere through useSearchParams, which needs a Suspense boundary.
export default function HomeValuePage() {
  const cell = getAgentProfile().mobilePhone;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />
        <section className="relative w-full bg-white pb-32 pt-32 md:pt-40">
          <div className="mx-auto w-full max-w-3xl px-6 md:px-12">
            <p className="text-[11px] font-medium uppercase leading-[1.8] tracking-[0.38em] text-ink-soft/70">
              Free home value for Cedarburg, Ozaukee County, and nearby
              Washington County
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
              What&apos;s your
              <br />
              home worth?
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
              {BNDRYIQ_LIVE ? (
                <>
                  Get an instant range from real comparable sales below. Want a
                  personal analysis? Drop me your info after, no pressure.
                </>
              ) : (
                <>
                  Tell me the address and I&apos;ll email you an honest range
                  within 24 hours, based on what is actually selling nearby. No
                  algorithm guess, no pressure.
                </>
              )}
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-ink-soft/80">
              I cover Cedarburg, Mequon, Thiensville, Grafton, Port Washington,
              Saukville, and nearby Washington County towns like West Bend,
              Hartford, Germantown, Jackson, and Slinger. Rather talk it
              through? Call or text me at{" "}
              <a
                href={telHref(cell)}
                data-placement="home_value"
                className="text-ink underline underline-offset-4"
              >
                {cell}
              </a>
              .
            </p>
            <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
              <HomeValueFunnel cell={cell} />
            </Suspense>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
