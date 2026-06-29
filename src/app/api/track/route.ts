import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin, checkRateLimit, getClientIp } from "@/lib/bot-defense";
import { getSupabase } from "@/lib/supabase-server";

const schema = z.object({
  visitorId: z.string().min(8).max(128),
  event: z.string().min(1).max(64),
  properties: z
    .record(z.string(), z.unknown())
    .refine((p) => JSON.stringify(p).length <= 4000, "properties too large")
    .optional(),
  path: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
});

export async function POST(req: Request) {
  // Track is high-volume legit usage (every page view), so we only gate on
  // origin. Rate limit and honeypot don't apply here.
  const originFailure = checkOrigin(req);
  if (originFailure) {
    return NextResponse.json(originFailure.body, { status: originFailure.status });
  }

  // Anti-flood (not anti-usage): generous per-IP cap for legit page-view volume.
  const clientIp = getClientIp(req) ?? "anonymous";
  const rateLimit = await checkRateLimit({
    key: `track:${clientIp}`,
    max: 60,
    windowMs: 60_000,
  });
  if (rateLimit) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  const { visitorId, event, properties, path, referrer } = parsed.data;

  const userAgent = req.headers.get("user-agent") ?? null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from("tracking_events").insert({
    visitor_id: visitorId,
    agent_id: process.env.DEFAULT_AGENT_ID ?? null,
    event,
    properties: properties ?? null,
    path: path ?? null,
    referrer: referrer ?? null,
    user_agent: userAgent,
    ip,
  });

  if (error) {
    console.error("[track] insert failed:", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
