import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fakeSupabase, type FakeSupabase } from "@/lib/fake-supabase";

// T-113: the confirm link in the River Report confirm email, and the
// unsubscribe link it must never be mistaken for. Resend is replaced (bun
// loads the live key from .env.local) and Supabase is an in-memory list.
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
let db: FakeSupabase;
mock.module("@/lib/supabase-server", () => ({ getSupabase: () => db.client }));

process.env.UNSUBSCRIBE_SECRET = "test-secret";
process.env.RESEND_API_KEY = "re_test";
process.env.NEWSLETTER_RESEND_API_KEY = "re_news";
process.env.NEWSLETTER_FROM_EMAIL = "anthony@news.anthonystolp.com";

const { GET } = await import("./route");
const { POST: unsubscribe } = await import("../../unsubscribe/route");
const { confirmToken } = await import("@/lib/newsletter-mail");
const { unsubscribeToken } = await import("@/lib/email-compliance");

const LID = "11111111-1111-4111-8111-111111111111";
const SOURCE = "market-report-subscribe";

beforeEach(() => {
  sent.length = 0;
  db = fakeSupabase({
    funnel_leads: [
      {
        id: LID,
        agent_id: null,
        source: SOURCE,
        email: "sam@example.com",
        name: "Sam",
        newsletter_confirmed_at: null,
        unsubscribed_at: "2026-11-10T00:00:00Z",
      },
    ],
  });
});

const confirm = (lid: string, t: string) =>
  GET(new Request(`https://anthonystolp.com/api/newsletter/confirm?lid=${lid}&t=${t}`));
const row = () => db.tables.funnel_leads[0];

describe("GET /api/newsletter/confirm", () => {
  test("a good link confirms, clears the unsubscribe, welcomes, and lands on /newsletter/confirmed", async () => {
    const res = await confirm(LID, confirmToken(LID));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://anthonystolp.com/newsletter/confirmed");
    expect(row().newsletter_confirmed_at).toBeTruthy();
    expect(row().unsubscribed_at).toBeNull();
    expect(sent.map((m) => m.subject)).toEqual(["You're on the list"]);
  });

  test("a bad link is an error page, noindex, and changes nothing", async () => {
    for (const res of [
      await confirm(LID, "0".repeat(32)),
      await confirm(LID, "not-a-token"),
      await confirm("not-a-uuid", confirmToken(LID)),
      await GET(new Request("https://anthonystolp.com/api/newsletter/confirm")),
    ]) {
      expect(res.status).toBe(400);
      const html = await res.text();
      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).toContain("This confirm link doesn't work");
    }
    expect(row().newsletter_confirmed_at).toBeNull();
    expect(row().unsubscribed_at).toBe("2026-11-10T00:00:00Z");
    expect(sent).toHaveLength(0);
  });

  test("an unsubscribe token cannot confirm", async () => {
    const res = await confirm(LID, unsubscribeToken(LID));
    expect(res.status).toBe(400);
    expect(row().newsletter_confirmed_at).toBeNull();
    expect(sent).toHaveLength(0);
  });
});

describe("POST /api/unsubscribe", () => {
  const post = (t: string) =>
    unsubscribe(
      new Request(`https://anthonystolp.com/api/unsubscribe?lid=${LID}&t=${t}`, {
        method: "POST",
      }),
    );

  test("a confirm token cannot unsubscribe", async () => {
    db.tables.funnel_leads[0].unsubscribed_at = null;
    const res = await post(confirmToken(LID));
    expect(res.status).toBe(400);
    expect(row().unsubscribed_at).toBeNull();
  });

  test("one click unsubscribe still works and names The River Report", async () => {
    db.tables.funnel_leads[0].unsubscribed_at = null;
    const res = await post(unsubscribeToken(LID));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(
      "You will no longer receive The River Report from Anthony Stolp.",
    );
    expect(row().unsubscribed_at).toBeTruthy();
  });
});
