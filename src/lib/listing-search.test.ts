import { describe, expect, test } from "bun:test";
import {
  FALLBACK_SEARCH,
  LISTING_SEARCH,
  listingSearchForSlug,
  listingSearchUrl,
} from "./listing-search";

describe("which search a page opens", () => {
  test("each town page opens its own town", () => {
    expect(listingSearchForSlug("cedarburg-homes-for-sale")).toBe("cedarburg");
    expect(listingSearchForSlug("port-washington-homes-for-sale")).toBe(
      "port-washington",
    );
    expect(listingSearchForSlug("ozaukee-county-homes-for-sale")).toBe(
      "ozaukee-county",
    );
  });

  test("a page with no town of its own opens Ozaukee County", () => {
    expect(FALLBACK_SEARCH).toBe("ozaukee-county");
    expect(listingSearchForSlug("buy-hub")).toBe("ozaukee-county");
    expect(listingSearchForSlug("downsizing-in-wisconsin")).toBe(
      "ozaukee-county",
    );
    expect(listingSearchForSlug("west-bend-homes-for-sale")).toBe(
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
    expect(listingSearchUrl("cedarburg")).toBe(
      "https://exsellexperts.com/properties/city-Cedarburg,%20WI/?listingType=Residential&status=Active&utm_source=anthonystolp&utm_medium=referral&utm_campaign=town-search&utm_content=cedarburg",
    );
  });

  test("never points at the bio page", () => {
    for (const url of Object.values(LISTING_SEARCH)) {
      expect(url).not.toContain("/anthony-stolp/");
      expect(url).toContain("status=Active");
    }
  });

  test("Thiensville is a place and Marinette is the county", () => {
    expect(LISTING_SEARCH.thiensville).toContain("/place-Thiensville,");
    expect(LISTING_SEARCH["marinette-homes"]).toContain("/county-Marinette,");
    expect(LISTING_SEARCH["marinette-land"]).toContain("listingType=Land");
  });
});
