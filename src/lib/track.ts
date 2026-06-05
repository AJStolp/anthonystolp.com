// Client-side event emitter. Fire-and-forget POST to /api/track + pixel-side mirror.
// Always include the visitor id so anonymous activity can be joined to a
// lead later when the same visitor identifies via a form.

import { getOrCreateVisitorId } from "./visitor";

type BaseFields = {
  path?: string;
  referrer?: string;
};

export type TrackEvent =
  | (BaseFields & { event: "page_view" })
  | (BaseFields & {
      event: "iframe_ready";
      properties: { tool: string };
    })
  | (BaseFields & {
      event: "estimate_seen";
      properties: {
        address: string;
        lat?: number;
        lng?: number;
        low?: number;
        high?: number;
        point?: number;
        confidence?: string;
        compsUsed?: number;
      };
    })
  | (BaseFields & {
      event: "form_started";
      properties: { source: string; hasEstimate: boolean };
    })
  | (BaseFields & { event: "home_value_view" })
  | (BaseFields & {
      event: "home_value_lead";
      properties: { hasEstimate: boolean; timeframe?: string };
    })
  | (BaseFields & {
      event: "search_gate_view";
      properties?: {
        campaign_id?: string;
        target_id?: string;
        qr_token?: string;
        niche_slug?: string;
      };
    })
  | (BaseFields & {
      event: "search_gate_lead";
      properties: {
        timeframe?: string;
        campaign_id?: string;
        target_id?: string;
        qr_token?: string;
        niche_slug?: string;
      };
    })
  | (BaseFields & {
      event: "market_report_view";
      properties: { zip: string; month?: string };
    })
  | (BaseFields & {
      event: "market_report_lead";
      properties: { zip: string };
    })
  | (BaseFields & {
      event: "farm_visit";
      properties: {
        qr_token: string;
        kind?: string;
        farm_target_id?: string;
      };
    });

type EventName = TrackEvent["event"];

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Mirror our internal events to ad-platform pixels. Ad accounts are configured
// to listen for these specific event names — do not rename without updating
// the Google Ads / Meta conversion configs.
function firePixels(name: EventName, properties: Record<string, unknown> | undefined): void {
  if (typeof window === "undefined") return;
  const props = properties ?? {};
  switch (name) {
    case "home_value_lead":
    case "search_gate_lead":
    case "market_report_lead":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      window.fbq?.("track", "Lead", props);
      break;
    case "home_value_view":
    case "search_gate_view":
    case "market_report_view":
    case "farm_visit":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      break;
    case "estimate_seen":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      window.fbq?.("track", "ViewContent", { content_category: "home_value" });
      break;
    // page_view, iframe_ready, form_started: stay internal — no pixel mirror.
    default:
      break;
  }
}

export function track(e: TrackEvent): void {
  if (typeof window === "undefined") return;
  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return;

  const properties = "properties" in e ? e.properties : undefined;

  firePixels(e.event, properties as Record<string, unknown> | undefined);

  const payload = JSON.stringify({
    visitorId,
    event: e.event,
    properties,
    path: e.path ?? window.location.pathname + window.location.search,
    referrer: e.referrer ?? (document.referrer || undefined),
  });

  // Prefer sendBeacon for unload-safety; fall back to fetch.
  const url = "/api/track";
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
