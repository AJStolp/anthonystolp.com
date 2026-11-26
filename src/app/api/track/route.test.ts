import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

// Every touch of the database, recorded: getSupabase calls, the rate limiter
// RPC, and each tracking_events insert.
const calls = { getSupabase: 0, rpc: [] as string[], inserts: [] as Record<string, unknown>[] };

mock.module("@/lib/supabase-server", () => ({
  getSupabase: () => {
    calls.getSupabase++;
    return {
      rpc: async (fn: string) => {
        calls.rpc.push(fn);
        return { data: true, error: null };
      },
      from: (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          calls.inserts.push({ table, ...row });
          return { error: null };
        },
      }),
    };
  },
}));

const { POST } = await import("./route");

const originalVercelEnv = process.env.VERCEL_ENV;

function setVercelEnv(value: string | undefined) {
  if (value === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = value;
}

async function track() {
  return POST(
    new Request("http://localhost:3000/api/track", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        visitorId: "visitor-12345678",
        event: "page_view",
        path: "/buy",
      }),
    }),
  );
}

beforeEach(() => {
  calls.getSupabase = 0;
  calls.rpc.length = 0;
  calls.inserts.length = 0;
});

afterAll(() => setVercelEnv(originalVercelEnv));

describe("/api/track outside the production deployment", () => {
  for (const env of [undefined, "development", "preview"]) {
    test(`VERCEL_ENV=${env ?? "unset"} answers skipped and touches no database`, async () => {
      setVercelEnv(env);
      const res = await track();

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, skipped: true });
      expect(calls.inserts).toEqual([]);
      expect(calls.rpc).toEqual([]);
      expect(calls.getSupabase).toBe(0);
    });
  }
});

describe("/api/track on the production deployment", () => {
  test("VERCEL_ENV=production inserts exactly one tracking_events row", async () => {
    setVercelEnv("production");
    const res = await track();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.rpc).toEqual(["increment_rate_limit"]);
    expect(calls.inserts).toHaveLength(1);
    expect(calls.inserts[0]).toMatchObject({
      table: "tracking_events",
      visitor_id: "visitor-12345678",
      event: "page_view",
      path: "/buy",
      ip: "127.0.0.1",
    });
  });
});
