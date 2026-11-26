import { beforeEach, describe, expect, mock, test } from "bun:test";

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
// No database and no Lofty in a unit test: persistLead logs and carries on,
// which is how the route behaves when Supabase is down.
mock.module("@/lib/supabase-server", () => ({
  getSupabase: () => {
    throw new Error("no Supabase in tests");
  },
}));
mock.module("@/lib/lofty", () => ({ createLoftyLead: async () => null }));
const nextServer = await import("next/server");
mock.module("next/server", () => ({ ...nextServer, after: () => {} }));

process.env.RESEND_API_KEY = "re_test";
process.env.LEAD_TO_EMAIL = "anthony@exsellexperts.com";
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
