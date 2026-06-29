import { NextResponse, type NextRequest } from "next/server";
import { bumpHit, resolveToken } from "@/lib/link-tokens";
import { getSupabase } from "@/lib/supabase-server";

const VISITOR_COOKIE = "anthonystolp_vid";
const TOKEN_COOKIE = "anthonystolp_token";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const FALLBACK_PATH = "/";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const row = await resolveToken(token);

  // Build redirect target. Unknown/expired tokens silently land on home —
  // we don't leak which slugs are valid, but we don't dead-end a real visitor.
  let targetUrl = new URL(row?.target_url ?? FALLBACK_PATH, req.url);

  // Open-redirect guard: never bounce a visitor off our own origin. Relative
  // target_urls (the common case, e.g. "/search/…") resolve same-origin and
  // pass; an admin-stored absolute off-site URL falls back to home instead.
  if (targetUrl.origin !== new URL(req.url).origin) {
    targetUrl = new URL(FALLBACK_PATH, req.url);
  }

  if (!row) {
    return NextResponse.redirect(targetUrl, { status: 302 });
  }

  // Mint or reuse visitor id so the upcoming tracking event + later /api/lead
  // submission share the same identity.
  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId) visitorId = crypto.randomUUID();

  // Best-effort tracking insert. Failures must not break the redirect.
  try {
    const supabase = getSupabase();
    await supabase.from("tracking_events").insert({
      visitor_id: visitorId,
      agent_id: row.agent_id ?? process.env.DEFAULT_AGENT_ID ?? null,
      event: "farm_visit",
      properties: { token, ...(row.context ?? {}) },
      path: `/n/${token}`,
      referrer: req.headers.get("referer") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        null,
    });
  } catch (err) {
    console.error("[/n/[token]] tracking insert failed:", err);
  }

  bumpHit(token).catch((err) =>
    console.error("[/n/[token]] bumpHit failed:", err),
  );

  const res = NextResponse.redirect(targetUrl, { status: 302 });
  const secure = req.nextUrl.protocol === "https:";
  res.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
  return res;
}
