import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

process.env.ADMIN_COOKIE_SECRET = "test-admin-secret";
const { ADMIN_COOKIE, createSessionCookie } = await import("@/lib/admin-auth");
const { POST } = await import("./route");

function request(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/admin/reports/abc/send", {
    method: "POST",
    headers: cookie ? { cookie: `${ADMIN_COOKIE}=${cookie}` } : {},
  });
}

describe("POST /api/admin/reports/[id]/send", () => {
  test("answers 410 to a signed in admin, saying sections go out in The River Report", async () => {
    const res = await POST(request(await createSessionCookie()));
    expect(res.status).toBe(410);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("The River Report");
  });

  test("still refuses a request with no admin session", async () => {
    const res = await POST(request());
    expect(res.status).toBe(401);
  });
});
