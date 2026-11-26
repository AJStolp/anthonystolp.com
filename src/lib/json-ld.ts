// The schema.org nodes every page shares, so search engines read one person
// and one brokerage wherever Anthony appears. A page puts both in its @graph
// next to its own nodes; worksFor and provider point here by @id, so a page
// that renders the agent must render the brokerage too or the reference
// dangles. /northwoods keeps its own nodes: it is a two person page.

import { getAgentProfile } from "@/lib/agent-profile";
import { telHref } from "@/lib/phone";

export const SITE_URL = "https://anthonystolp.com";
export const AGENT_ID = `${SITE_URL}/#agent`;
export const BROKERAGE_ID = `${SITE_URL}/#brokerage`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const profile = getAgentProfile();
// "(262) 483-7932" → "+12624837932"
const cell = telHref(profile.mobilePhone).replace("tel:", "");
const office = telHref(profile.phone).replace("tel:", "");
const email = "anthony@exsellexperts.com";

export const agentCredential = {
  "@type": "EducationalOccupationalCredential",
  credentialCategory: "license",
  recognizedBy: {
    "@type": "GovernmentOrganization",
    name: "State of Wisconsin",
  },
  identifier: profile.licenseNumber,
};

// Entity corroboration only: these must be real estate identities for the
// same person, or they tell the knowledge graph AJ is a different business.
export const agentSameAs = [
  "https://exsellexperts.com/anthony-stolp/",
  "https://www.homes.com/real-estate-agents/anthony-stolp/kq5sqyc/",
];

export const agentJsonLd = {
  "@type": "RealEstateAgent",
  "@id": AGENT_ID,
  name: profile.name,
  url: SITE_URL,
  image: `${SITE_URL}/images/anthony-headshot.png`,
  // The cell, the number every page asks visitors to call or text.
  telephone: cell,
  email,
  jobTitle: "Realtor",
  worksFor: { "@id": BROKERAGE_ID },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cedarburg",
    addressRegion: "WI",
    addressCountry: "US",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: cell,
      email,
      areaServed: "US-WI",
      availableLanguage: "en",
    },
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      name: "Office",
      telephone: office,
    },
  ],
  // The six towns lead, so the entity matches the Cedarburg and Ozaukee
  // targeting; the counties stay as the wider service area.
  areaServed: [
    { "@type": "City", name: "Cedarburg, Wisconsin" },
    { "@type": "City", name: "Mequon, Wisconsin" },
    { "@type": "City", name: "Thiensville, Wisconsin" },
    { "@type": "City", name: "Grafton, Wisconsin" },
    { "@type": "City", name: "Port Washington, Wisconsin" },
    { "@type": "City", name: "Saukville, Wisconsin" },
    { "@type": "AdministrativeArea", name: "Ozaukee County, Wisconsin" },
    { "@type": "AdministrativeArea", name: "Washington County, Wisconsin" },
    { "@type": "AdministrativeArea", name: "Waukesha County, Wisconsin" },
    { "@type": "AdministrativeArea", name: "Sheboygan County, Wisconsin" },
    { "@type": "AdministrativeArea", name: "Milwaukee County, Wisconsin" },
  ],
  hasCredential: agentCredential,
  knowsLanguage: "en",
  // TODO: add the Google Business Profile URL to sameAs once it's verified (ContentEngine will send it)
  sameAs: agentSameAs,
};

export const brokerageJsonLd = {
  "@type": "RealEstateOrganization",
  "@id": BROKERAGE_ID,
  name: profile.brokerage,
  telephone: office,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Germantown",
    addressRegion: "WI",
    addressCountry: "US",
  },
};
