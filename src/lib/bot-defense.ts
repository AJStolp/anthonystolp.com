// Lightweight bot defense for public POST endpoints.
//
// Three layers, ranked by cost vs leverage:
//   1. Origin check — reject cross-origin POSTs from unknown referers
//   2. Honeypot     — hidden form field; humans leave it empty, bots fill it
//   3. Rate limit   — in-memory window per IP; bounded memory, no infra dep
//
// Honeypot rejections return success (200 ok) so attackers don't learn the
// trap. Origin and rate-limit rejections return 4xx since legitimate clients
// won't hit them.

import { getSupabase } from "@/lib/supabase-server";

const ALLOWED_ORIGINS = new Set([
  "https://anthonystolp.com",
  "https://www.anthonystolp.com",
  // Add additional production origins here as deploy targets grow.
]);

// Permit common dev hosts unconditionally — Next dev / Vercel preview / local IPs.
const DEV_ORIGIN_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.[\d.]+|\[::1\])(:\d+)?$/;

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? null;
}

export type DefenseFailure = {
  status: number;
  body: { error: string };
  silent: boolean; // when true, caller should pretend success
};

/**
 * Origin / Referer match against an allowlist + dev pattern. Returns null on
 * success, or a failure descriptor.
 */
export function checkOrigin(req: Request): DefenseFailure | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Vercel cron + admin routes hit endpoints server-side with no Origin/Referer.
  // Don't reject when neither header is set — but the *callers* (forms, fetch)
  // we care about always send at least one. This means we only filter when a
  // header is present and wrong.
  const source = origin ?? (referer ? safeOriginOf(referer) : null);
  if (!source) return null;

  if (ALLOWED_ORIGINS.has(source)) return null;
  if (DEV_ORIGIN_RE.test(source)) return null;
  if (source.endsWith(".vercel.app")) return null; // preview deploys

  console.warn("[bot-defense] origin blocked:", source);
  return {
    status: 403,
    body: { error: "forbidden" },
    silent: false,
  };
}

function safeOriginOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Honeypot field check. The client submits the JSON body with a known
 * hidden field name; humans leave it empty (or it isn't filled at all),
 * bots commonly fill every text field. Any non-empty value = bot.
 *
 * Returns null on pass, or a silent failure on trip (so attackers don't learn
 * the trap exists).
 */
export function checkHoneypot(body: Record<string, unknown>): DefenseFailure | null {
  const trap = body["hp_company"];
  if (typeof trap === "string" && trap.trim().length > 0) {
    const ip = "unknown";
    console.warn(`[bot-defense] honeypot tripped (ip=${ip}, value="${trap.slice(0, 40)}")`);
    return {
      status: 200,
      body: { ok: true } as never,
      silent: true,
    };
  }
  return null;
}

// ── Rate limit ────────────────────────────────────────────────────────────
// In-memory sliding window. Bounded by IP-key count; we prune both old
// timestamps within a bucket and old buckets entirely on each call.
//
// Caveat: serverless instances don't share memory, so a determined attacker
// hitting different cold instances could bypass. Vercel keeps warm instances
// pinned per region; this catches ~95% of real-world flood patterns. If we
// hit organized abuse, swap to Upstash Redis.

type Bucket = { hits: number[]; lastSeen: number };
const buckets = new Map<string, Bucket>();
const BUCKET_TTL_MS = 5 * 60_000; // drop buckets that haven't been touched in 5 min
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  key: string; // usually `${ip}:${endpoint}`
};

const RATE_LIMIT_FAILURE: DefenseFailure = {
  status: 429,
  body: { error: "Too many requests. Please try again in a minute." },
  silent: false,
};

/**
 * Cross-instance rate limit backed by the Supabase increment_rate_limit RPC
 * (fixed window, shared across serverless instances). If Supabase is
 * unconfigured or the RPC errors, fall back to the in-memory sliding window so
 * local dev and DB-degraded states still enforce a limit.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<DefenseFailure | null> {
  try {
    const supabase = getSupabase();
    const windowSeconds = Math.max(1, Math.ceil(opts.windowMs / 1000));
    const { data, error } = await supabase.rpc("increment_rate_limit", {
      p_key: opts.key,
      p_window_seconds: windowSeconds,
      p_max: opts.max,
    });
    if (error) throw error;
    if (data === false) {
      console.warn(`[bot-defense] rate limit hit: ${opts.key}`);
      return RATE_LIMIT_FAILURE;
    }
    return null;
  } catch (err) {
    console.warn(
      "[bot-defense] rate-limit RPC unavailable, using in-memory fallback:",
      err,
    );
    return checkRateLimitInMemory(opts);
  }
}

function checkRateLimitInMemory(opts: RateLimitOptions): DefenseFailure | null {
  const now = Date.now();
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now);
    lastSweep = now;
  }
  const cutoff = now - opts.windowMs;
  const b = buckets.get(opts.key) ?? { hits: [], lastSeen: now };
  b.hits = b.hits.filter((t) => t > cutoff);
  if (b.hits.length >= opts.max) {
    b.lastSeen = now;
    buckets.set(opts.key, b);
    console.warn(`[bot-defense] rate limit hit: ${opts.key}`);
    return {
      status: 429,
      body: { error: "Too many requests. Please try again in a minute." },
      silent: false,
    };
  }
  b.hits.push(now);
  b.lastSeen = now;
  buckets.set(opts.key, b);
  return null;
}

function sweep(now: number) {
  const cutoff = now - BUCKET_TTL_MS;
  for (const [k, v] of buckets) {
    if (v.lastSeen < cutoff) buckets.delete(k);
  }
}

/**
 * Convenience: run all three checks for a lead-submission endpoint and return
 * the first failure, or null if all pass.
 */
export async function runLeadDefenses(
  req: Request,
  body: Record<string, unknown>,
  opts?: { rateLimit?: { max: number; windowMs: number } },
): Promise<DefenseFailure | null> {
  const origin = checkOrigin(req);
  if (origin) return origin;

  const honeypot = checkHoneypot(body);
  if (honeypot) return honeypot;

  const ip = getClientIp(req) ?? "anonymous";
  const rl = opts?.rateLimit ?? { max: 10, windowMs: 60_000 };
  const rateLimit = await checkRateLimit({
    key: `lead:${ip}`,
    max: rl.max,
    windowMs: rl.windowMs,
  });
  if (rateLimit) return rateLimit;

  return null;
}
