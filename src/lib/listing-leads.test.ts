import { describe, expect, test } from "bun:test";
import { listingLoftyLead } from "./listing-leads";

describe("listing sign ups in Lofty", () => {
  test("a listing alert is tagged with its town and says what they want", () => {
    expect(
      listingLoftyLead({
        source: "listing-alert",
        email: "buyer@example.com",
        town: "Cedarburg",
        priceRange: "300k-500k",
        beds: "3",
      }),
    ).toEqual({
      firstName: "buyer",
      email: "buyer@example.com",
      source: "Website Listing Alert",
      tags: ["Buyer", "Listing alert: Cedarburg"],
      note: "Asked for new Cedarburg listings first ($300K to $500K, 3+ beds). Set up their saved search.",
    });
  });

  test("a saved home is tagged with its address", () => {
    const lead = listingLoftyLead({
      source: "save-home",
      email: "a@b.co",
      address: "521 Alta Loma",
      propertySlug: "521-alta-loma",
    });
    expect(lead?.tags).toEqual(["Buyer", "Saved home: 521 Alta Loma"]);
    expect(lead?.source).toBe("Website Saved Home");
  });

  test("homes like a sold one are tagged Similar homes", () => {
    const lead = listingLoftyLead({
      source: "similar-homes",
      email: "a@b.co",
      address: "521 Alta Loma",
    });
    expect(lead?.tags).toEqual(["Buyer", "Similar homes: 521 Alta Loma"]);
  });

  test("not for another form, and not without an email", () => {
    expect(listingLoftyLead({ source: "contact-form", email: "a@b.co" })).toBeNull();
    expect(listingLoftyLead({ source: "listing-alert", town: "Mequon" })).toBeNull();
    expect(listingLoftyLead({ source: "listing-alert", email: "  " })).toBeNull();
  });
});
