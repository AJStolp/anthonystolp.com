// Build-time feature flags. NEXT_PUBLIC_* env vars get inlined by Next at
// build time, so consumers can `import { HOME_VALUE_ENABLED }` from server
// AND client components without runtime evaluation.
//
// Defaults are intentionally OFF — production has to opt features in.

export const HOME_VALUE_ENABLED =
  process.env.NEXT_PUBLIC_HOME_VALUE_ENABLED === "true";

// Sub-flag: even when the home-value funnel is on, the bndryiq iframe can
// remain hidden. Only meaningful when HOME_VALUE_ENABLED=true.
export const BNDRYIQ_ENABLED =
  process.env.NEXT_PUBLIC_BNDRYIQ_ENABLED === "true";

// Where sell-intent CTAs go when the home-value funnel is disabled.
// Format note: query string BEFORE fragment so the browser scrolls to
// #contact AND LeadForm's useEffect reads ?intent=sell from window.search.
// Use sellFallbackHref() for additional UTM params; the constant is for
// simple callers without UTM context.
export function sellFallbackHref(
  extraParams?: Record<string, string>,
): string {
  const params = new URLSearchParams({ intent: "sell", ...extraParams });
  return `/?${params.toString()}#contact`;
}
export const SELL_FALLBACK_HREF = sellFallbackHref();
