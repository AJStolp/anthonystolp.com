import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { NameReveal } from "@/components/NameReveal";
import { Approach } from "@/components/Approach";
import { LeadForm } from "@/components/LeadForm";
import { Footer } from "@/components/Footer";

const SITE_URL = "https://anthonystolp.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": `${SITE_URL}/#agent`,
      name: "Anthony Stolp",
      url: SITE_URL,
      image: `${SITE_URL}/opengraph-image`,
      telephone: "+1-262-885-3310",
      email: "anthony@exsellexperts.com",
      jobTitle: "Realtor",
      worksFor: {
        "@type": "RealEstateOrganization",
        name: "ExSell Experts at Epique Realty",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Germantown",
        addressRegion: "WI",
        addressCountry: "US",
      },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Ozaukee County, Wisconsin" },
        { "@type": "AdministrativeArea", name: "Washington County, Wisconsin" },
        { "@type": "AdministrativeArea", name: "Waukesha County, Wisconsin" },
        { "@type": "AdministrativeArea", name: "Sheboygan County, Wisconsin" },
        { "@type": "AdministrativeArea", name: "Milwaukee County, Wisconsin" },
      ],
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "license",
        recognizedBy: {
          "@type": "GovernmentOrganization",
          name: "State of Wisconsin",
        },
        identifier: "114204-94",
      },
      knowsLanguage: "en",
      sameAs: ["https://unchonk.com", "https://polarlightsimaging.com"],
    },
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

export default function Home() {
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
        <Hero />
        <NameReveal />
        <Approach />
        <LeadForm />
        <Footer />
      </main>
    </>
  );
}
