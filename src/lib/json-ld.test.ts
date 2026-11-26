import { describe, expect, test } from "bun:test";
import { agentJsonLd, brokerageJsonLd } from "./json-ld";

describe("the shared agent node", () => {
  test("is the site's one #agent", () => {
    expect(agentJsonLd["@type"]).toBe("RealEstateAgent");
    expect(agentJsonLd["@id"]).toBe("https://anthonystolp.com/#agent");
    expect(agentJsonLd.image).toBe("https://anthonystolp.com/images/anthony-headshot.png");
  });

  test("leads with the cell and keeps the office as a second contact point", () => {
    expect(agentJsonLd.telephone).toBe("+12624837932");
    expect(agentJsonLd.contactPoint).toEqual([
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: "+12624837932",
        email: "anthony@exsellexperts.com",
        areaServed: "US-WI",
        availableLanguage: "en",
      },
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        name: "Office",
        telephone: "+12628853310",
      },
    ]);
  });

  test("works for the brokerage node, by @id", () => {
    expect(agentJsonLd.worksFor).toEqual({ "@id": "https://anthonystolp.com/#brokerage" });
    expect(agentJsonLd.worksFor["@id"]).toBe(brokerageJsonLd["@id"]);
  });

  test("serves the six towns and five counties", () => {
    expect(agentJsonLd.areaServed.map((a) => a.name)).toEqual([
      "Cedarburg, Wisconsin",
      "Mequon, Wisconsin",
      "Thiensville, Wisconsin",
      "Grafton, Wisconsin",
      "Port Washington, Wisconsin",
      "Saukville, Wisconsin",
      "Ozaukee County, Wisconsin",
      "Washington County, Wisconsin",
      "Waukesha County, Wisconsin",
      "Sheboygan County, Wisconsin",
      "Milwaukee County, Wisconsin",
    ]);
  });

  test("carries the Wisconsin license and the two real estate profiles", () => {
    expect(agentJsonLd.hasCredential.identifier).toBe("114204-94");
    expect(agentJsonLd.sameAs).toEqual([
      "https://exsellexperts.com/anthony-stolp/",
      "https://www.homes.com/real-estate-agents/anthony-stolp/kq5sqyc/",
    ]);
  });
});

describe("the shared brokerage node", () => {
  test("is #brokerage, on the office phone, in Germantown", () => {
    expect(brokerageJsonLd).toEqual({
      "@type": "RealEstateOrganization",
      "@id": "https://anthonystolp.com/#brokerage",
      name: "ExSell Experts | Epique Realty",
      telephone: "+12628853310",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Germantown",
        addressRegion: "WI",
        addressCountry: "US",
      },
    });
  });
});
