import { describe, expect, test } from "bun:test";
import { listingLoftyLead } from "./listing-leads";

describe("listing sign ups in Lofty", () => {
  test("a listing alert is tagged with its town and says what they want", () => {
    expect(
      listingLoftyLead({
        source: "listing-alert",
        firstName: "Jamie",
        lastName: "Rivera",
        email: "buyer@example.com",
        town: "Cedarburg",
        priceRange: "300k-500k",
        beds: "3",
      }),
    ).toEqual({
      firstName: "Jamie",
      lastName: "Rivera",
      email: "buyer@example.com",
      source: "Website Listing Alert",
      tags: ["Buyer", "Listing alert: Cedarburg"],
      note: "Asked for new Cedarburg listings first ($300K to $500K, 3+ beds). Set up their saved search.",
    });
  });

  test("a saved home is tagged with its address", () => {
    const lead = listingLoftyLead({
      source: "save-home",
      firstName: "Pat",
      lastName: "Lee",
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
      firstName: "Pat",
      email: "a@b.co",
      address: "521 Alta Loma",
    });
    expect(lead?.tags).toEqual(["Buyer", "Similar homes: 521 Alta Loma"]);
  });

  test("not for another form, and not without an email", () => {
    expect(
      listingLoftyLead({ source: "contact-form", firstName: "Pat", email: "a@b.co" }),
    ).toBeNull();
    expect(
      listingLoftyLead({ source: "listing-alert", firstName: "Pat", town: "Mequon" }),
    ).toBeNull();
    expect(
      listingLoftyLead({ source: "listing-alert", firstName: "Pat", email: "  " }),
    ).toBeNull();
  });

  test("never filed under part of the email: no first name, no Lofty lead", () => {
    expect(listingLoftyLead({ source: "listing-alert", email: "jsmith42@example.com" })).toBeNull();
    expect(
      listingLoftyLead({ source: "save-home", firstName: "  ", email: "jsmith42@example.com" }),
    ).toBeNull();
  });

  test("a missing last name is left empty, not invented", () => {
    const lead = listingLoftyLead({ source: "similar-homes", firstName: "Pat", email: "a@b.co" });
    expect(lead?.firstName).toBe("Pat");
    expect(lead?.lastName).toBeNull();
  });
});
