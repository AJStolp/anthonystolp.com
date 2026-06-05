// Capture marketing attribution at the moment a lead-capture form mounts.
// Returns a payload that mirrors the shape /api/lead expects, so the caller
// can spread it directly into a fetch body.

export type Attribution = {
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrer?: string;
  landingPage?: string;
};

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);

  const utm = stripEmpty({
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    term: params.get("utm_term") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  });

  return {
    utm: Object.keys(utm).length ? utm : undefined,
    referrer: document.referrer || undefined,
    landingPage: window.location.href,
  };
}

function stripEmpty<T extends Record<string, string | undefined>>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
}
