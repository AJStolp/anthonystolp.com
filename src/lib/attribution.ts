// Identity and marketing attribution for lead-capture forms. Returns a payload
// that mirrors the shape /api/lead expects, so the caller can spread it
// directly into a fetch body.
//
// visitorId rides along deliberately. /api/lead only backfills a lead's earlier
// tracking_events when the payload carries one, and three funnels used to
// forget it (see #54). Returning it here means any surface that spreads
// attribution is stitched, and a new funnel cannot silently omit it.
//
// Attribution is persisted to a cookie on first touch rather than read from the
// live URL at form time. A visitor who lands on /?gclid=… and then navigates
// before converting has no query string left by the time the form mounts, so
// reading window.location there loses the click entirely.

import { getOrCreateVisitorId } from "./visitor";

const COOKIE_NAME = "anthonystolp_attr";
// Google drops an offline conversion uploaded more than 90 days after the
// click, so persisting a click id past that window buys nothing. Note that
// Safari's ITP caps script-written cookies at ~7 days regardless.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
// Keep the cookie small: it rides along on every same-origin request.
const MAX_URL_LENGTH = 512;

export type Utm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

// wbraid/gbraid are Google's iOS-privacy click ids and arrive instead of gclid,
// never alongside it. msclkid is Microsoft Ads, fbclid is Meta.
export type ClickIds = {
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
  msclkid?: string;
  fbclid?: string;
  clickAt?: string;
};

export type Attribution = {
  utm?: Utm;
  click?: ClickIds;
  referrer?: string;
  landingPage?: string;
  visitorId?: string;
};

// Called once per page load from TrackingInit. Writes the cookie only when this
// URL actually carries attribution, so an ad click survives later navigation and
// an ordinary page view never overwrites it.
//
// Last touch, not first touch: a fresh click id replaces the stored one, which
// is what Google credits when a visitor clicks two ads before converting.
export function persistAttribution(): void {
  if (typeof document === "undefined") return;
  const fromUrl = readFromUrl();
  if (!fromUrl.click && !fromUrl.utm?.source) return;
  writeCookie(COOKIE_NAME, JSON.stringify(fromUrl), MAX_AGE_SECONDS);
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const fromUrl = readFromUrl();
  const stored = readStored();

  // utm and click are taken as whole groups, never merged: pairing a gclid from
  // this URL with a campaign from an earlier click would misreport both.
  return {
    utm: fromUrl.utm ?? stored?.utm,
    click: fromUrl.click ?? stored?.click,
    referrer: stored?.referrer ?? (document.referrer || undefined),
    landingPage: stored?.landingPage ?? window.location.href,
    // Minting rather than reading: TrackingInit has already run by form time,
    // so this is virtually always a read, but it must never come back empty.
    visitorId: getOrCreateVisitorId(),
  };
}

function readFromUrl(): Attribution {
  const params = new URLSearchParams(window.location.search);

  const utm = stripEmpty({
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    term: params.get("utm_term") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  });

  const click = stripEmpty({
    gclid: params.get("gclid") ?? undefined,
    wbraid: params.get("wbraid") ?? undefined,
    gbraid: params.get("gbraid") ?? undefined,
    msclkid: params.get("msclkid") ?? undefined,
    fbclid: params.get("fbclid") ?? undefined,
  });

  return {
    utm: Object.keys(utm).length ? utm : undefined,
    click: Object.keys(click).length
      ? { ...click, clickAt: new Date().toISOString() }
      : undefined,
    referrer: document.referrer || undefined,
    landingPage: window.location.href.slice(0, MAX_URL_LENGTH),
  };
}

function readStored(): Attribution | null {
  const raw = readCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Attribution;
  } catch {
    return null;
  }
}

function stripEmpty<T extends Record<string, string | undefined>>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
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
