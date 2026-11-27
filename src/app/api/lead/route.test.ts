import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fakeSupabase, type FakeSupabase } from "@/lib/fake-supabase";

// What the route hands to Resend, one entry per emails.send call.
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
// No database unless a test sets `db`: persistLead logs and carries on, which
// is how the route behaves when Supabase is down. No Lofty and no Claude.
let db: FakeSupabase | null = null;
mock.module("@/lib/supabase-server", () => ({
  getSupabase: () => {
    if (!db) throw new Error("no Supabase in tests");
    return db.client;
  },
}));
const lofty: unknown[] = [];
mock.module("@/lib/lofty", () => ({
  createLoftyLead: async (lead: unknown) => (lofty.push(lead), null),
}));
mock.module("@/lib/ai-draft", () => ({ generateDraft: async () => null }));
// after() work is held here, and a test that needs it runs it with flush().
const deferred: (() => Promise<unknown> | unknown)[] = [];
const nextServer = await import("next/server");
mock.module("next/server", () => ({
  ...nextServer,
  after: (fn: () => Promise<unknown> | unknown) => {
    deferred.push(fn);
  },
}));
async function flush() {
  while (deferred.length) await deferred.shift()!();
}

process.env.RESEND_API_KEY = "re_test";
process.env.LEAD_TO_EMAIL = "anthony@exsellexperts.com";
process.env.UNSUBSCRIBE_SECRET = "test-secret";
process.env.NEWSLETTER_FROM_EMAIL = "anthony@news.anthonystolp.com";
const { POST } = await import("./route");

let ip = 0;
async function submit(source: string) {
  const res = await POST(
    new Request("http://localhost:3000/api/lead", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        // A fresh address per call so the rate limiter never trips.
        "x-forwarded-for": `10.0.0.${++ip}`,
      },
      body: JSON.stringify({
        source,
        funnelStep: "completed",
        name: "Sam Tester",
        email: "sam@example.com",
        message: "Forty acres near Pembine.",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const notification = sent.find((m) => m.to === "anthony@exsellexperts.com");
  expect(notification).toBeDefined();
  return notification!;
}

beforeEach(() => {
  sent.length = 0;
  lofty.length = 0;
  deferred.length = 0;
  db = null;
});

describe("the lead notification email", () => {
  test("copies Jay on a lead from the Northwoods contact form", async () => {
    const email = await submit("northwoods");
    expect(email.cc).toEqual(["jaystolp@exsellexperts.com"]);
  });

  test("copies Jay on a lead from the Northwoods listing search", async () => {
    const email = await submit("northwoods-search");
    expect(email.cc).toEqual(["jaystolp@exsellexperts.com"]);
  });

  test("copies nobody on a lead from anywhere else on the site", async () => {
    for (const source of ["contact-form", "home-value", "search-redirect", "listing-alert"]) {
      sent.length = 0;
      const email = await submit(source);
      expect(email.cc).toBeUndefined();
    }
  });
});

// T-113: The River Report signup posts here as market-report-subscribe.
describe("a River Report signup", () => {
  const SOURCE = "market-report-subscribe";
  const NEWS_FROM = "Anthony Stolp <anthony@news.anthonystolp.com>";

  async function signUp(fields: Record<string, unknown>) {
    const res = await POST(
      new Request("http://localhost:3000/api/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": `10.0.1.${++ip}`,
        },
        body: JSON.stringify({
          source: SOURCE,
          funnelStep: "completed",
          intent: "exploring",
          termsConsent: true,
          hp_company: "",
          placement: "footer",
          ...fields,
        }),
      }),
    );
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }
  const confirms = () => sent.filter((m) => m.subject === "Confirm your River Report signup");

  test("is labelled River Report signup in Anthony's alert", async () => {
    const email = await submit(SOURCE);
    expect(email.subject).toBe("New river report signup: Sam Tester");
    expect(String(email.html)).toContain("River Report signup");
  });

  test("needs no zip, saves the row, and sends the confirm email after the response", async () => {
    db = fakeSupabase({ funnel_leads: [] });
    const { status, body } = await signUp({ email: "sam@example.com", firstName: "Sam" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, accepted: true });
    const [row] = db.tables.funnel_leads;
    expect(row).toMatchObject({ source: SOURCE, email: "sam@example.com", name: "Sam", postal_code: null });
    expect(body.leadId).toBe(row.id as string);
    expect((row.raw as Record<string, unknown>).placement).toBe("footer");

    // Deferred: nothing went to the subscriber before the response.
    expect(confirms()).toHaveLength(0);
    await flush();
    expect(confirms()).toHaveLength(1);
    expect(confirms()[0]).toMatchObject({ from: NEWS_FROM, to: "sam@example.com" });
    expect(String(confirms()[0].text)).toContain(`lid=${row.id}`);
  });

  test("keeps the zip when one is picked", async () => {
    db = fakeSupabase({ funnel_leads: [] });
    await signUp({ email: "sam@example.com", postalCode: "53012" });
    expect(db.tables.funnel_leads[0].postal_code).toBe("53012");
  });

  test("from an email already confirmed: same success, no second confirm email", async () => {
    db = fakeSupabase({
      funnel_leads: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          source: SOURCE,
          email: "sam@example.com",
          newsletter_confirmed_at: "2026-11-01T00:00:00Z",
          unsubscribed_at: null,
        },
      ],
    });
    const { status, body } = await signUp({ email: "sam@example.com" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, accepted: true });
    await flush();
    expect(confirms()).toHaveLength(0);
  });

  test("still succeeds when the confirm email cannot be sent", async () => {
    db = fakeSupabase({ funnel_leads: [] });
    const { status } = await signUp({ email: "sam@example.com" });
    expect(status).toBe(200);
    // Supabase goes away before the deferred work runs: it is caught there.
    db = null;
    const error = console.error;
    console.error = () => {};
    try {
      await flush();
    } finally {
      console.error = error;
    }
    expect(confirms()).toHaveLength(0);
  });

  test("is never pushed to Lofty", async () => {
    db = fakeSupabase({ funnel_leads: [] });
    await signUp({ email: "sam@example.com", firstName: "Sam" });
    await flush();
    expect(lofty).toHaveLength(0);
  });
});
