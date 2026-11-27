import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { fakeSupabase } from "./fake-supabase";

// T-113: The River Report's double opt-in. Bun loads .env.local, which holds
// a live RESEND_API_KEY, so Resend is replaced before anything imports it:
// each send lands in `sent` and nothing leaves the machine.
const sent: Record<string, unknown>[] = [];
mock.module("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return { data: { id: "test" }, error: null };
      },
    };
  },
}));

const { unsubscribeToken, verifyUnsubscribeToken } = await import("./email-compliance");
const {
  confirmNewsletter,
  confirmToken,
  newsletterFrom,
  sendNewsletterConfirm,
  verifyConfirmToken,
} = await import("./newsletter-mail");
const { getAgentProfile } = await import("./agent-profile");

const agent = getAgentProfile();
const LID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SOURCE = "market-report-subscribe";
const NEWS_FROM = "anthony@news.anthonystolp.com";

const env = { ...process.env };
beforeEach(() => {
  sent.length = 0;
  process.env.UNSUBSCRIBE_SECRET = "test-secret";
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEWSLETTER_FROM_EMAIL = NEWS_FROM;
});
afterEach(() => {
  process.env = { ...env };
});

describe("confirm links", () => {
  test("a confirm token for a lead verifies for that lead only", () => {
    const t = confirmToken(LID);
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(verifyConfirmToken(LID, t)).toBe(true);
    expect(verifyConfirmToken(OTHER, t)).toBe(false);
    expect(verifyConfirmToken(LID, "0".repeat(32))).toBe(false);
    expect(verifyConfirmToken(LID, t.slice(0, 31))).toBe(false);
  });

  test("an unsubscribe token cannot confirm", () => {
    expect(verifyConfirmToken(LID, unsubscribeToken(LID))).toBe(false);
  });

  test("a confirm token cannot unsubscribe", () => {
    expect(verifyUnsubscribeToken(LID, confirmToken(LID))).toBe(false);
  });

  test("falls back to CRON_SECRET, and refuses to sign with no secret at all", () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    process.env.CRON_SECRET = "cron-secret";
    const withCron = confirmToken(LID);
    expect(verifyConfirmToken(LID, withCron)).toBe(true);
    delete process.env.CRON_SECRET;
    expect(() => confirmToken(LID)).toThrow(/Refusing to sign/);
  });
});

describe("the newsletter sender", () => {
  test("is Anthony at the news subdomain", () => {
    expect(newsletterFrom(agent)).toBe(`Anthony Stolp <${NEWS_FROM}>`);
  });

  test("is nothing when NEWSLETTER_FROM_EMAIL is unset, or on the root domain", () => {
    delete process.env.NEWSLETTER_FROM_EMAIL;
    expect(newsletterFrom(agent)).toBeNull();
    for (const bad of [
      "anthony@anthonystolp.com",
      "hello@anthonystolp.com",
      "anthony@news.anthonystolp.com.evil.com",
      "not an email",
    ]) {
      process.env.NEWSLETTER_FROM_EMAIL = bad;
      expect(newsletterFrom(agent)).toBeNull();
    }
  });
});

describe("the confirm email after a signup", () => {
  test("goes to a new signup from the news subdomain with a working confirm link", async () => {
    const db = fakeSupabase({
      funnel_leads: [{ id: LID, source: SOURCE, email: "sam@example.com" }],
    });
    const result = await sendNewsletterConfirm(db.client, {
      leadId: LID,
      email: "sam@example.com",
      firstName: "Sam",
    });
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    const [msg] = sent;
    expect(msg.from).toBe(`Anthony Stolp <${NEWS_FROM}>`);
    expect(msg.replyTo).toBe(agent.replyToEmail);
    expect(msg.to).toBe("sam@example.com");
    expect(msg.subject).toBe("Confirm your River Report signup");
    expect(msg.text).toContain("Hi Sam,");
    const link = /https:\/\/anthonystolp\.com\/api\/newsletter\/confirm\?lid=([^&]+)&t=([0-9a-f]{32})/.exec(
      String(msg.text),
    );
    expect(link).not.toBeNull();
    expect(link![1]).toBe(LID);
    expect(verifyConfirmToken(LID, link![2])).toBe(true);
    expect(String(msg.html)).toContain("Confirm my signup");
    expect(`${msg.text}${msg.html}`).not.toMatch(/[–—→]/);
  });

  test("greets 'there' when no first name was given", async () => {
    const db = fakeSupabase({ funnel_leads: [] });
    await sendNewsletterConfirm(db.client, { leadId: LID, email: "sam@example.com" });
    expect(sent[0].text).toContain("Hi there,");
  });

  test("does not go to an email already confirmed and still subscribed", async () => {
    const db = fakeSupabase({
      funnel_leads: [
        { id: OTHER, source: SOURCE, email: "sam@example.com", newsletter_confirmed_at: "2026-11-01T00:00:00Z", unsubscribed_at: null },
        { id: LID, source: SOURCE, email: "sam@example.com", newsletter_confirmed_at: null },
      ],
    });
    const result = await sendNewsletterConfirm(db.client, { leadId: LID, email: "sam@example.com" });
    expect(result).toBe("already-confirmed");
    expect(sent).toHaveLength(0);
    // The repeat signup's own row joins the confirmed list.
    expect(db.tables.funnel_leads.find((r) => r.id === LID)?.newsletter_confirmed_at).toBeTruthy();
  });

  test("goes again to an email that confirmed once and then unsubscribed", async () => {
    const db = fakeSupabase({
      funnel_leads: [
        { id: OTHER, source: SOURCE, email: "sam@example.com", newsletter_confirmed_at: "2026-11-01T00:00:00Z", unsubscribed_at: "2026-11-10T00:00:00Z" },
        { id: LID, source: SOURCE, email: "sam@example.com", newsletter_confirmed_at: null },
      ],
    });
    expect(await sendNewsletterConfirm(db.client, { leadId: LID, email: "sam@example.com" })).toBe("sent");
    expect(sent).toHaveLength(1);
  });

  test("is not sent, with a warning, when the sender is not on the news subdomain", async () => {
    process.env.NEWSLETTER_FROM_EMAIL = "anthony@anthonystolp.com";
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const db = fakeSupabase({ funnel_leads: [] });
    const result = await sendNewsletterConfirm(db.client, { leadId: LID, email: "sam@example.com" });
    expect(result).toBe("not-sent");
    expect(sent).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain("news.anthonystolp.com");
    warn.mockRestore();
  });
});

describe("clicking the confirm link", () => {
  function list() {
    return fakeSupabase({
      funnel_leads: [
        // The signup whose link was clicked, with a zip.
        { id: LID, agent_id: null, source: SOURCE, email: "sam@example.com", name: "Sam Tester", newsletter_confirmed_at: null, unsubscribed_at: null },
        // An older signup by the same person that they had unsubscribed.
        { id: OTHER, agent_id: null, source: SOURCE, email: "sam@example.com", name: null, newsletter_confirmed_at: null, unsubscribed_at: "2026-11-10T00:00:00Z" },
        // Someone else, and the same person through a different funnel.
        { id: "33333333-3333-4333-8333-333333333333", source: SOURCE, email: "pat@example.com", newsletter_confirmed_at: null, unsubscribed_at: null },
        { id: "44444444-4444-4444-8444-444444444444", source: "contact-form", email: "sam@example.com", newsletter_confirmed_at: null, unsubscribed_at: "2026-11-10T00:00:00Z" },
      ],
    });
  }

  test("confirms every signup row for that email, clears its unsubscribe, and sends the welcome", async () => {
    const db = list();
    expect(await confirmNewsletter(db.client, LID, confirmToken(LID))).toBe("confirmed");

    const [mine, older, pat, contact] = db.tables.funnel_leads;
    expect(mine.newsletter_confirmed_at).toBeTruthy();
    expect(older.newsletter_confirmed_at).toBeTruthy();
    expect(older.unsubscribed_at).toBeNull();
    expect(pat.newsletter_confirmed_at).toBeNull();
    expect(contact.newsletter_confirmed_at).toBeNull();
    expect(contact.unsubscribed_at).toBe("2026-11-10T00:00:00Z");

    expect(sent).toHaveLength(1);
    const [welcome] = sent;
    expect(welcome.from).toBe(`Anthony Stolp <${NEWS_FROM}>`);
    expect(welcome.replyTo).toBe(agent.replyToEmail);
    expect(welcome.to).toBe("sam@example.com");
    expect(welcome.subject).toBe("You're on the list");
    expect(welcome.text).toContain("Hi Sam,");
    expect(welcome.text).toContain("https://anthonystolp.com/home-value");
    expect(welcome.text).toContain("you signed up for The River Report, Anthony Stolp's monthly email.");
    expect(welcome.text).toContain(agent.mailingAddress);
    expect((welcome.headers as Record<string, string>)["List-Unsubscribe"]).toContain(
      `lid=${LID}&t=${unsubscribeToken(LID)}`,
    );
    expect(`${welcome.text}${welcome.html}`).not.toMatch(/[–—→]/);
  });

  test("a wrong token changes nothing and sends nothing", async () => {
    const db = list();
    const before = structuredClone(db.tables.funnel_leads);
    expect(await confirmNewsletter(db.client, LID, "0".repeat(32))).toBe("invalid");
    expect(await confirmNewsletter(db.client, LID, confirmToken(OTHER))).toBe("invalid");
    expect(db.tables.funnel_leads).toEqual(before);
    expect(sent).toHaveLength(0);
  });

  test("an unsubscribe token for the same lead cannot confirm it", async () => {
    const db = list();
    const before = structuredClone(db.tables.funnel_leads);
    expect(await confirmNewsletter(db.client, LID, unsubscribeToken(LID))).toBe("invalid");
    expect(db.tables.funnel_leads).toEqual(before);
    expect(sent).toHaveLength(0);
  });

  test("a good token for a lead that is not a signup confirms nothing", async () => {
    const db = list();
    const contactId = "44444444-4444-4444-8444-444444444444";
    expect(await confirmNewsletter(db.client, contactId, confirmToken(contactId))).toBe("invalid");
    expect(db.tables.funnel_leads.every((r) => !r.newsletter_confirmed_at)).toBe(true);
  });

  test("a second click on a used link sends no second welcome", async () => {
    const db = list();
    await confirmNewsletter(db.client, LID, confirmToken(LID));
    expect(await confirmNewsletter(db.client, LID, confirmToken(LID))).toBe("confirmed");
    expect(sent).toHaveLength(1);
  });
});
