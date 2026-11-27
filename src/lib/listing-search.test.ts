import { describe, expect, test } from "bun:test";
import {
  FALLBACK_SEARCH,
  LISTING_SEARCH,
  listingSearchForSlug,
  listingSearchUrl,
  townSearchForSlug,
} from "./listing-search";

describe("which pages get the town tiles", () => {
  test("each of the ten homes for sale pages names its town", () => {
    expect(townSearchForSlug("cedarburg-homes-for-sale")).toBe("cedarburg");
    expect(townSearchForSlug("mequon-homes-for-sale")).toBe("mequon");
    expect(townSearchForSlug("thiensville-homes-for-sale")).toBe("thiensville");
    expect(townSearchForSlug("grafton-homes-for-sale")).toBe("grafton");
    expect(townSearchForSlug("port-washington-homes-for-sale")).toBe(
      "port-washington",
    );
    expect(townSearchForSlug("saukville-homes-for-sale")).toBe("saukville");
    expect(townSearchForSlug("ozaukee-county-homes-for-sale")).toBe(
      "ozaukee-county",
    );
    expect(townSearchForSlug("west-bend-homes-for-sale")).toBe("west-bend");
    expect(townSearchForSlug("hartford-homes-for-sale")).toBe("hartford");
    expect(townSearchForSlug("germantown-homes-for-sale")).toBe("germantown");
  });

  test("home value pages and guides get none, with no fallback", () => {
    expect(townSearchForSlug("cedarburg-home-value")).toBeNull();
    expect(townSearchForSlug("ozaukee-county-home-value")).toBeNull();
    expect(townSearchForSlug("west-bend-home-value")).toBeNull();
    expect(townSearchForSlug("germantown-home-value")).toBeNull();
    expect(townSearchForSlug("downsizing-in-wisconsin")).toBeNull();
    expect(townSearchForSlug("selling-a-house-during-divorce-wisconsin")).toBeNull();
  });

  test("a town with no search, a bare town, or a Northwoods search gets none", () => {
    // Jackson and Slinger are named on the homepage but have no pages.
    expect(townSearchForSlug("jackson-homes-for-sale")).toBeNull();
    expect(townSearchForSlug("slinger-homes-for-sale")).toBeNull();
    expect(townSearchForSlug("cedarburg")).toBeNull();
    expect(townSearchForSlug("-homes-for-sale")).toBeNull();
    expect(townSearchForSlug("cedarburg-homes-for-sale-old")).toBeNull();
    expect(townSearchForSlug("marinette-homes-homes-for-sale")).toBeNull();
    expect(townSearchForSlug("marinette-land-homes-for-sale")).toBeNull();
    expect(townSearchForSlug("constructor-homes-for-sale")).toBeNull();
  });
});

describe("which search a page opens", () => {
  test("each town page opens its own town", () => {
    expect(listingSearchForSlug("cedarburg-homes-for-sale")).toBe("cedarburg");
    expect(listingSearchForSlug("port-washington-homes-for-sale")).toBe(
      "port-washington",
    );
    expect(listingSearchForSlug("ozaukee-county-homes-for-sale")).toBe(
      "ozaukee-county",
    );
    expect(listingSearchForSlug("west-bend-homes-for-sale")).toBe("west-bend");
    expect(listingSearchForSlug("hartford-homes-for-sale")).toBe("hartford");
    expect(listingSearchForSlug("germantown-homes-for-sale")).toBe("germantown");
  });

  test("a page with no town of its own opens Ozaukee County", () => {
    expect(FALLBACK_SEARCH).toBe("ozaukee-county");
    expect(listingSearchForSlug("buy-hub")).toBe("ozaukee-county");
    expect(listingSearchForSlug("downsizing-in-wisconsin")).toBe(
      "ozaukee-county",
    );
    expect(listingSearchForSlug("jackson-homes-for-sale")).toBe(
      "ozaukee-county",
    );
  });

  test("a name an object already has is not a town", () => {
    expect(listingSearchForSlug("constructor")).toBe("ozaukee-county");
    expect(listingSearchForSlug("toString-homes-for-sale")).toBe(
      "ozaukee-county",
    );
  });
});

describe("the search URL", () => {
  test("adds the town-search tags with & to AgentFire's own query", () => {
    expect(listingSearchUrl("cedarburg", "town_page")).toBe(
      "https://exsellexperts.com/properties/city-Cedarburg,%20WI/?listingType=Residential&status=Active&utm_source=anthonystolp&utm_medium=referral&utm_campaign=town-search&utm_content=cedarburg&utm_term=town_page",
    );
  });

  test("names where the link sits in utm_term", () => {
    const url = new URL(listingSearchUrl("marinette-land", "northwoods"));
    expect(url.searchParams.get("utm_term")).toBe("northwoods");
    expect(url.searchParams.get("utm_content")).toBe("marinette-land");
    expect(url.searchParams.get("listingType")).toBe("Land");
    expect(new URL(listingSearchUrl("ozaukee-county", "buy")).searchParams.get("utm_term")).toBe("buy");
  });

  test("never points at the bio page", () => {
    for (const url of Object.values(LISTING_SEARCH)) {
      expect(url).not.toContain("/anthony-stolp/");
      expect(url).toContain("status=Active");
    }
  });

  // Taken from AgentFire's own search box on 2026-11-26 (T-106). Written out
  // here so a URL built from the town name cannot pass.
  test("the three Washington County towns open the searches AgentFire gave", () => {
    expect(LISTING_SEARCH["west-bend"]).toBe(
      "https://exsellexperts.com/properties/city-West%20Bend,%20WI/?listingType=Residential&status=Active",
    );
    expect(LISTING_SEARCH.hartford).toBe(
      "https://exsellexperts.com/properties/city-Hartford,%20WI/?listingType=Residential&status=Active",
    );
    expect(LISTING_SEARCH.germantown).toBe(
      "https://exsellexperts.com/properties/place-Germantown,%20WI/?listingType=Residential&status=Active",
    );
  });

  test("Thiensville is a place and Marinette is the county", () => {
    expect(LISTING_SEARCH.thiensville).toContain("/place-Thiensville,");
    expect(LISTING_SEARCH["marinette-homes"]).toContain("/county-Marinette,");
    expect(LISTING_SEARCH["marinette-land"]).toContain("listingType=Land");
  });
});
