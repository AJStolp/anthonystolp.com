import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionCookie,
  SESSION_COOKIE_OPTS,
} from "@/lib/admin-auth";
import { checkRateLimit, getClientIp } from "@/lib/bot-defense";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  // Throttle brute-force attempts per IP *before* the password check, so
  // correctness doesn't matter — 5 attempts per 15 minutes.
  const ip = getClientIp(req) ?? "anonymous";
  const rateLimit = await checkRateLimit({
    key: `admin-login:${ip}`,
    max: 5,
    windowMs: 900_000,
  });
  if (rateLimit) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }

  if (!checkPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const cookie = await createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, cookie, SESSION_COOKIE_OPTS);
  return res;
}
