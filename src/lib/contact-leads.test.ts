import { describe, expect, test } from "bun:test";
import { contactLoftyLead, isContactLeadSource } from "./contact-leads";

describe("contact forms in Lofty", () => {
  test("the home page form files the name, intent and message", () => {
    expect(
      contactLoftyLead({
        source: "contact-form",
        name: " Pat  van Dyke ",
        email: "pat@example.com",
        phone: "(262) 555-0100",
        intent: "sell",
        message: " Thinking spring. ",
      }),
    ).toEqual({
      firstName: "Pat",
      lastName: "van Dyke",
      email: "pat@example.com",
      phone: "(262) 555-0100",
      source: "Website Contact",
      tags: ["Contact form", "Seller"],
      note: "Sent the contact form on the website and wants to sell. Message: Thinking spring.",
    });
  });

  test("the Northwoods form is tagged Northwoods", () => {
    const lead = contactLoftyLead({ source: "northwoods", name: "Sam", email: "s@example.com", intent: "buy" });
    expect(lead?.source).toBe("Website Northwoods");
    expect(lead?.tags).toEqual(["Northwoods", "Buyer"]);
    expect(lead?.lastName).toBeNull();
    expect(lead?.note).toBe("Sent the Northwoods contact form on the website and wants to buy.");
  });

  test("never filed without a name, and never for another form", () => {
    expect(contactLoftyLead({ source: "contact-form", name: "  ", email: "x@example.com" })).toBeNull();
    expect(contactLoftyLead({ source: "search-redirect", name: "Pat", email: "x@example.com" })).toBeNull();
    expect(isContactLeadSource("toString")).toBe(false);
  });
});
