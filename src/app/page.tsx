import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { HomesForSale } from "@/components/HomesForSale";
import { TrustStrip } from "@/components/TrustStrip";
import { Reviews } from "@/components/Reviews";
import { RecentResults } from "@/components/RecentResults";
import { Approach } from "@/components/Approach";
import { Communities } from "@/components/Communities";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { LeadForm } from "@/components/LeadForm";
import { Footer } from "@/components/Footer";
import { getRecentResults } from "@/lib/properties";
import { getAgentProfile } from "@/lib/agent-profile";
import { agentJsonLd, brokerageJsonLd } from "@/lib/json-ld";
import { seasonalLine } from "@/lib/seasonal";

// The hero card reads properties from Supabase, so the home page is ISR rather
// than fully static: a status flip in /admin shows up within the window.
export const revalidate = 300;

const SITE_URL = "https://anthonystolp.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    agentJsonLd,
    brokerageJsonLd,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Anthony Stolp",
      description:
        "Honest guidance for buyers and sellers across southeast Wisconsin.",
      publisher: { "@id": `${SITE_URL}/#agent` },
      inLanguage: "en-US",
    },
  ],
};

export default async function Home() {
  // One query feeds both surfaces: the hero features the newest result and the
  // band shows the rest, so the same listing never appears twice.
  const [featured, ...rest] = await getRecentResults(4);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main
        id="main"
        className="relative w-full overflow-x-hidden"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />
        <Hero
          featured={featured ?? null}
          cell={getAgentProfile().mobilePhone}
          seasonal={seasonalLine()}
        />
        <HomesForSale />
        <TrustStrip />
        <Reviews />
        <RecentResults results={rest} />
        <Approach />
        <Communities />
        <div className="w-full bg-white py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6 md:px-12">
            <NewsletterSignup
              variant="card"
              placement="home"
              id="market-report"
              cell={getAgentProfile().mobilePhone}
            />
          </div>
        </div>
        <LeadForm cell={getAgentProfile().mobilePhone} />
        <Footer />
      </main>
    </>
  );
}
