import { describe, expect, test } from "bun:test";
import { alertSubject, homeValueLoftyLead, isHotLead, townOf } from "./hot-lead";

const hot = {
  source: "home-value",
  name: "Test Lead ContentEngine",
  email: "seller@example.com",
  phone: "(262) 555-0100",
  timeframe: "1-3mo",
  address: "W62N215 Washington Ave, Cedarburg, WI 53012",
};

describe("which leads are hot", () => {
  test("a home value lead selling in 1 to 3 months", () => {
    expect(isHotLead(hot)).toBe(true);
  });
  test("not a later timeframe, and not another form", () => {
    expect(isHotLead({ ...hot, timeframe: "3-6mo" })).toBe(false);
    expect(isHotLead({ ...hot, timeframe: "curious" })).toBe(false);
    expect(isHotLead({ ...hot, source: "search-redirect" })).toBe(false);
  });
});

describe("the lead alert email's subject", () => {
  test("a hot lead leads with HOT and what Anthony needs to call", () => {
    expect(alertSubject(hot, "New home value request: Test Lead ContentEngine")).toBe(
      "HOT: 1 to 3 months. Test Lead ContentEngine, W62N215 Washington Ave, Cedarburg, WI 53012, (262) 555-0100",
    );
  });
  test("says when there is no phone", () => {
    expect(alertSubject({ ...hot, phone: "" }, "x")).toEndWith(", no phone");
  });
  test("any other lead keeps its plain subject", () => {
    expect(alertSubject({ ...hot, timeframe: "6-12mo" }, "New home value request: X")).toBe(
      "New home value request: X",
    );
  });
});

describe("the town a lead names", () => {
  test("found in a typed address", () => {
    expect(townOf({ address: "123 Main St, Port Washington" })).toBe("Port Washington");
    expect(townOf({ address: "5 Elm, west bend wi" })).toBe("West Bend");
  });
  test("a city field wins", () => {
    expect(townOf({ address: "1 A St, Cedarburg", city: "Grafton" })).toBe("Grafton");
  });
  test("none when the address names no town the site serves", () => {
    expect(townOf({ address: "1 A St, Milwaukee" })).toBeNull();
  });
});

describe("the Lofty lead for a home value request", () => {
  test("a hot lead is tagged Hot, with its town and timeframe", () => {
    const l = homeValueLoftyLead(hot)!;
    expect(l.firstName).toBe("Test");
    expect(l.lastName).toBe("Lead ContentEngine");
    expect(l.source).toBe("Website Home Value");
    expect(l.tags).toEqual(["Seller", "Home Value", "Cedarburg", "1 to 3 months", "Hot"]);
    expect(l.note).toBe(
      "Hot home value lead. Home value request for W62N215 Washington Ave, Cedarburg, WI 53012. Thinking about selling: 1 to 3 months.",
    );
  });
  test("a later seller is not tagged Hot", () => {
    expect(homeValueLoftyLead({ ...hot, timeframe: "6-12mo" })!.tags).toEqual([
      "Seller",
      "Home Value",
      "Cedarburg",
      "6 to 12 months",
    ]);
  });
  test("carries bndryiq's range and the seller's notes when there are any", () => {
    const l = homeValueLoftyLead({
      ...hot,
      message: "New roof in 2024.",
      bndryiqEstimate: { low: 410000, high: 455000 },
    })!;
    expect(l.note).toContain("bndryiq range: $410,000 to $455,000.");
    expect(l.note).toEndWith("Notes: New roof in 2024.");
  });
  test("none without a name", () => {
    expect(homeValueLoftyLead({ ...hot, name: "  " })).toBeNull();
  });
});
