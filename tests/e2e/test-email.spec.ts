import { test, expect } from "@playwright/test";
import { testEmail, TEST_EMAIL_PATTERN } from "./test-email";

// No page and no request: these run without a browser or the dev server, and
// write nothing anywhere.
test.describe("Test lead addresses", () => {
  const pattern = new RegExp(TEST_EMAIL_PATTERN);

  test("are Resend's delivered test inbox, labeled with the run stamp", () => {
    const address = testEmail("contact");
    expect(address).toMatch(/^delivered\+pw-[0-9]+-contact@resend\.dev$/);
    expect(address).toMatch(pattern);
    expect(address).not.toContain("anthonystolp.com");
  });

  test("differ by label and repeat for the same label", () => {
    expect(testEmail("contact")).not.toBe(testEmail("marketreport"));
    expect(testEmail("contact")).toBe(testEmail("contact"));
  });

  test("refuse a label that is empty or would break the address", () => {
    for (const label of ["", "Sam", "a@b", "a+b", "a b", "a.b"]) {
      expect(() => testEmail(label), JSON.stringify(label)).toThrow(/testEmail label/);
    }
  });

  test("the cleanup pattern does not match a real inbox or the retired form", () => {
    for (const address of [
      "pw-1764201600000+contact@anthonystolp.com",
      "delivered@resend.dev",
      "delivered+contact@resend.dev",
      "delivered+pw-1764201600000-contact@resend.dev.example.com",
      "anthony@exsellexperts.com",
    ]) {
      expect(address).not.toMatch(pattern);
    }
  });
});
