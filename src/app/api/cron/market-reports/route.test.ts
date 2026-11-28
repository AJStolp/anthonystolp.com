import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fakeSupabase } from "@/test/fake-supabase";

// What the cron hands to Resend, one entry per emails.send call.
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

// No real Claude. The draft call gets a valid section back and the fact check
// call gets a pass, so the real validateDraft decides the row's status.
const ATTRIBUTION = "Data from Redfin Data Center. Past performance does not predict future results.";
const claudeSystemPrompts: string[] = [];
mock.module("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      parse: async (req: { system: Array<{ text: string }> }) => {
        const system = req.system[0].text;
        claudeSystemPrompts.push(system);
        if (system.startsWith("You are a fact-checker")) {
          return { parsed_output: { claims: [], accurate: true, confidence: 92, summary: "All claims match." } };
        }
        return {
          parsed_output: {
            subject: "Cedarburg (53012)",
            bodyText: `The median sale price was $512,000 over the last 90 days.\n\nIf you are selling, price it right.\n\n${ATTRIBUTION}`,
            bodyHtml: `<p>The median sale price was <strong>$512,000</strong>.</p><p>${ATTRIBUTION}</p>`,
          },
        };
      },
    };
  },
}));

const confirmed = "2026-11-01T00:00:00Z";
function seed(opts: { failTables?: string[] } = {}) {
  const lead = { source: "market-report-subscribe", email: "sub@example.com", name: "Sam Tester" };
  const stats = (zip: string) => ({ zip, month: "2026-10-01", median_price: 512000 });
  return fakeSupabase({
    funnel_leads: [
      { id: "l1", ...lead, postal_code: "53012", newsletter_confirmed_at: confirmed, unsubscribed_at: null },
      { id: "l2", ...lead, postal_code: "53092", newsletter_confirmed_at: null, unsubscribed_at: null },
      { id: "l3", ...lead, postal_code: "53097", newsletter_confirmed_at: confirmed, unsubscribed_at: "2026-11-10T00:00:00Z" },
    ],
    market_stats: [stats("53012"), stats("53092"), stats("53097")],
    market_reports: [],
  }, opts);
}
let db = seed();
mock.module("@/lib/supabase-server", () => ({ getSupabase: () => db.client }));

process.env.CRON_SECRET = "cron-test-secret";
process.env.REDFIN_DISABLED = "true";
process.env.AUTO_SEND = "true";
process.env.RESEND_API_KEY = "re_test";
process.env.ANTHROPIC_API_KEY = "sk-test";
const { GET } = await import("./route");
const { DEFAULT_AGENT_ID, getAgentProfile } = await import("@/lib/agent-profile");

function cron(auth = "Bearer cron-test-secret") {
  return GET(new Request("http://localhost:3000/api/cron/market-reports", { headers: { authorization: auth } }));
}

beforeEach(() => {
  sent.length = 0;
  claudeSystemPrompts.length = 0;
  db = seed();
});

describe("the market reports cron", () => {
  test("drafts a section for the zip with a confirmed subscriber and emails only Anthony, even with AUTO_SEND on", async () => {
    const res = await cron();
    expect(res.status).toBe(200);
    const summary = (await res.json()) as { month: string; reports: Array<{ zip: string; status: string }> };

    const rows = db.inserts.market_reports ?? [];
    expect(rows.map((r) => r.zip)).toEqual(["53012"]);
    expect(rows[0].status).toBe("ready");
    expect(summary.reports.find((r) => r.zip === "53012")?.status).toBe("ready");
    expect(summary.reports.find((r) => r.zip === "53092")?.status).toBe("skipped-no-subscribers");
    expect(summary.reports.find((r) => r.zip === "53097")?.status).toBe("skipped-no-subscribers");

    const agent = getAgentProfile(DEFAULT_AGENT_ID);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(agent.replyToEmail);
    expect(sent[0].subject).toBe(`River Report zip sections, ${summary.month}`);
    expect(String(sent[0].subject)).not.toContain("—");
    expect(String(sent[0].text)).not.toContain("—");
  });

  test("asks Claude for a section with no greeting, first name or sign off, keeping the Redfin line", async () => {
    await cron();
    const draftPrompt = claudeSystemPrompts.find((p) => !p.startsWith("You are a fact-checker"));
    expect(draftPrompt).toBeDefined();
    expect(draftPrompt).toContain("ONE SECTION of The River Report");
    expect(draftPrompt).toContain(ATTRIBUTION);
    expect(draftPrompt).not.toContain("{{first_name}}");
    // The shared voice notes mention Anthony's personal sign off; the
    // structure must not ask for one in the section.
    expect(draftPrompt).not.toContain('Sign off: "Talk soon,"');
    expect(draftPrompt).toContain("The newsletter supplies the greeting and the sign off, so the section has neither.");
    expect(draftPrompt).not.toContain("—");
  });

  test("reports a failed insert to Anthony in the summary, with no em dash", async () => {
    db = seed({ failTables: ["market_reports"] });
    const res = await cron();
    const summary = (await res.json()) as { reports: Array<{ zip: string; status: string }> };
    expect(summary.reports.find((r) => r.zip === "53012")?.status).toBe("insert-failed");

    expect(sent).toHaveLength(1);
    const text = String(sent[0].text);
    expect(text).toContain("- 53012: insert-failed: market_reports unavailable");
    expect(text).not.toContain("\u2014");
  });

  test("refuses a request without the cron secret and drafts nothing", async () => {
    const res = await cron("Bearer wrong");
    expect(res.status).toBe(401);
    expect(db.inserts.market_reports).toBeUndefined();
    expect(sent).toHaveLength(0);
  });
});
