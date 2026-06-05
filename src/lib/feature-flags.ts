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
// Prefills the contact form with intent=sell so Anthony sees the right
// signal and can reply with a personal range.
export const SELL_FALLBACK_HREF = "/#contact?intent=sell";
