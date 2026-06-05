// First-party visitor ID — minted on first page load, cookied for 30 days,
// passed into the bndryiq iframe so tracking can be joined cross-domain.

const COOKIE_NAME = "anthonystolp_vid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 * 12; // ~1 year

export function getOrCreateVisitorId(): string {
  if (typeof document === "undefined") return "";
  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeCookie(COOKIE_NAME, id, MAX_AGE_SECONDS);
  return id;
}

export function readVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  return readCookie(COOKIE_NAME);
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[$()*+./?[\\\]^{|}-]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}
