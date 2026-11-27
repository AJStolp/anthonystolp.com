import { describe, expect, test } from "bun:test";
import { fakeSupabase } from "@/test/fake-supabase";
import { validateDraft, zipHasSubscribers, type Draft } from "./market-report";

const ATTRIBUTION = "Data from Redfin Data Center. Past performance does not predict future results.";

function section(overrides: Partial<Draft> = {}): Draft {
  return {
    subject: "Cedarburg (53012)",
    bodyText: [
      "Over the last 90 days the median sale price in 53012 was $512,000, up 4.2% on the prior window.",
      "Homes sold in 21 days on average, three days faster than before.",
      "If you are selling this spring, pricing right still matters more than timing.",
      ATTRIBUTION,
    ].join("\n\n"),
    bodyHtml: `<p>Over the last 90 days the median sale price was <strong>$512,000</strong>.</p><p>${ATTRIBUTION}</p>`,
    ...overrides,
  };
}

describe("validateDraft for a River Report section", () => {
  test("accepts a section with no greeting, no first name and no sign off", () => {
    const result = validateDraft(section());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test("rejects an em dash", () => {
    const draft = section();
    const result = validateDraft({ ...draft, bodyText: draft.bodyText.replace("up 4.2%", "— up 4.2%") });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Contains em dash (use period or comma)");
  });

  test("rejects a section with the Redfin attribution missing", () => {
    const draft = section();
    const result = validateDraft({
      ...draft,
      bodyText: draft.bodyText.replace(ATTRIBUTION, "Numbers are approximate."),
      bodyHtml: draft.bodyHtml.replace(ATTRIBUTION, "Numbers are approximate."),
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Missing 'Data from Redfin Data Center' attribution in bodyText");
    expect(result.issues).toContain(
      "Missing exact 'Redfin Data Center' attribution in bodyHtml (required for linkify)",
    );
  });

  test("rejects a fifth paragraph as too long", () => {
    const draft = section();
    const result = validateDraft({ ...draft, bodyText: `${draft.bodyText}\n\nOne more paragraph.` });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Section too long (5 paragraphs)");
  });
});

describe("zipHasSubscribers", () => {
  const base = { source: "market-report-subscribe", postal_code: "53012", email: "sam@example.com" };

  test("counts a confirmed subscriber who has not unsubscribed", async () => {
    const { client } = fakeSupabase({
      funnel_leads: [{ id: "a", ...base, newsletter_confirmed_at: "2026-11-01T00:00:00Z", unsubscribed_at: null }],
    });
    expect(await zipHasSubscribers(client, "53012")).toBe(true);
  });

  test("does not count a signup that never confirmed", async () => {
    const { client } = fakeSupabase({
      funnel_leads: [{ id: "a", ...base, newsletter_confirmed_at: null, unsubscribed_at: null }],
    });
    expect(await zipHasSubscribers(client, "53012")).toBe(false);
  });

  test("does not count a confirmed subscriber who unsubscribed", async () => {
    const { client } = fakeSupabase({
      funnel_leads: [
        {
          id: "a",
          ...base,
          newsletter_confirmed_at: "2026-11-01T00:00:00Z",
          unsubscribed_at: "2026-11-10T00:00:00Z",
        },
      ],
    });
    expect(await zipHasSubscribers(client, "53012")).toBe(false);
  });

  test("does not count a confirmed subscriber from another funnel or another zip", async () => {
    const confirmed = { newsletter_confirmed_at: "2026-11-01T00:00:00Z", unsubscribed_at: null };
    const { client } = fakeSupabase({
      funnel_leads: [
        { id: "a", ...base, ...confirmed, source: "contact-form" },
        { id: "b", ...base, ...confirmed, postal_code: "53092" },
      ],
    });
    expect(await zipHasSubscribers(client, "53012")).toBe(false);
  });

  test("throws when the lookup fails rather than reading it as no subscribers", async () => {
    const { client } = fakeSupabase({ funnel_leads: [] }, { failTables: ["funnel_leads"] });
    await expect(zipHasSubscribers(client, "53012")).rejects.toThrow("subscriber check failed");
  });
});
