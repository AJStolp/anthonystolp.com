// Admin session — single-user, password-gated. HMAC-signed cookie via Web Crypto
// (works on both Node and edge runtime so the middleware can use the same code).
//
// Cookie format: `<base64url-payload>.<base64url-signature>`
// Payload: `{ exp: number /* unix seconds */ }`

import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_COOKIE = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type Payload = { exp: number };

function getSecret(): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error("ADMIN_COOKIE_SECRET is not set");
  }
  return secret;
}

function getPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

// Timing-safe compare without leaking length. Returns false on length mismatch.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function checkPassword(input: string): boolean {
  const expected = getPassword();
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(padded);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionCookie(): Promise<string> {
  const payload: Payload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const payloadB64 = b64urlEncode(payloadBytes);

  const key = await importKey(getSecret());
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64)),
  );
  const sigB64 = b64urlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionCookie(
  value: string | undefined,
): Promise<boolean> {
  if (!value) return false;
  const [payloadB64, sigB64] = value.split(".");
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await importKey(getSecret());
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      new TextEncoder().encode(payloadB64),
    );
    if (!ok) return false;

    const payloadJson = new TextDecoder().decode(
      new Uint8Array(b64urlDecode(payloadB64)),
    );
    const payload = JSON.parse(payloadJson) as Payload;
    if (typeof payload.exp !== "number") return false;
    if (Math.floor(Date.now() / 1000) > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

// Defense-in-depth: a second, independent auth check inside each admin route
// handler (the proxy/middleware is the first gate). Reads the session cookie
// the same way proxy.ts does and returns a 401 when missing/invalid.
export async function requireAdmin(
  req: NextRequest,
): Promise<NextResponse | null> {
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = await verifySessionCookie(cookie);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
