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
      event: "estimate_seen";
      properties: {
        address: string;
        lat?: number;
        lng?: number;
        low?: number;
        high?: number;
        point?: number;
        compsUsed?: number;
      };
    })
  | (BaseFields & {
      event: "form_started";
      properties: { source: string; hasEstimate: boolean };
    })
  | (BaseFields & { event: "home_value_view" })
  | (BaseFields & {
      event: "contact_form_lead";
      properties: { intent?: string };
    })
  | (BaseFields & {
      event: "open_house_lead";
      properties: { propertySlug: string; hasAgent?: string };
    })
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
      event: "search_gate_skip";
      properties: {
        campaign_id?: string;
        target_id?: string;
        qr_token?: string;
        niche_slug?: string;
        // The listing search the skip leads to, e.g. "cedarburg".
        town: string;
        destination: "town_search";
      };
    })
  | (BaseFields & {
      // Any click out to an AgentFire listing search. `source` says how the
      // visitor got there: by skipping the gate, by submitting it, or straight
      // through because they had already seen it.
      event: "search_outbound";
      properties: {
        town: string;
        source: "gate_skip" | "gate_submit" | "direct";
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
      // A tap on any tel: or sms: link. `placement` names where the link sits
      // (sticky_bar, hero, footer, city_top, ...); ContactClickTracking
      // reads it from the link's data-placement.
      event: "call_click" | "text_click";
      // property_slug is set on a property page's own call or text line.
      properties: { page: string; placement: string; property_slug?: string };
    })
  | (BaseFields & {
      // The listing alert card on a town page scrolled into view, once a page.
      event: "listing_alert_view";
      properties: { town: string; page_path: string };
    })
  | (BaseFields & {
      event: "listing_alert_lead";
      properties: {
        town: string;
        price_range?: string;
        beds?: string;
        page_path: string;
      };
    })
  | (BaseFields & {
      event: "save_home_click" | "save_home_lead";
      properties: { property_slug: string; status: string; page_path: string };
    })
  | (BaseFields & {
      event: "similar_homes_lead";
      properties: { property_slug: string; page_path: string };
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
    case "contact_form_lead":
    case "open_house_lead":
    case "listing_alert_lead":
    case "save_home_lead":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      window.fbq?.("track", "Lead", props);
      break;
    case "call_click":
    case "text_click":
    case "home_value_view":
    case "search_gate_view":
    case "search_gate_skip":
    case "listing_alert_view":
    case "save_home_click":
    case "similar_homes_lead":
    case "market_report_view":
    case "farm_visit":
    case "search_outbound":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      break;
    case "estimate_seen":
      window.gtag?.("event", name, props);
      window.fbq?.("trackCustom", name, props);
      window.fbq?.("track", "ViewContent", { content_category: "home_value" });
      break;
    // page_view, form_started: stay internal — no pixel mirror.
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
