import type { NextConfig } from "next";

// Pragmatic CSP. We rely on 'unsafe-inline'/'unsafe-eval' for scripts because
// Next hydration and the gtag/fbq inline init (src/components/Pixels.tsx) are
// inline, and a nonce-based policy is too invasive for this change. Third-party
// hosts below are the ones actually loaded: Google gtag/GTM + Analytics, Meta
// pixel (connect.facebook.net / facebook.com), Ahrefs analytics, Mapbox
// (api.mapbox.com), Unsplash images, and same-origin Supabase-backed APIs.
//
// The Google Ads hosts below are pre-flight: no AW- tag is configured yet
// (NEXT_PUBLIC_GADS_ID is unset), but the conversion tag loads from
// googleadservices.com and beacons to googleads.g.doubleclick.net, and a
// blocked conversion ping is silent — no error, no failing test, just zero
// conversions and Smart Bidding optimising against nothing. Sourced from
// developers.google.com/tag-platform/security/guides/csp. The per-TLD google
// hosts that guide lists are omitted: CSP cannot wildcard the right side of a
// hostname and this site's traffic is US-only.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://connect.facebook.net https://analytics.ahrefs.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com https://api.mapbox.com https://www.google-analytics.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://google.com https://www.facebook.com https://connect.facebook.net",
  "font-src 'self' data:",
  // GA4 does not send everything to google-analytics.com. It also beacons
  // page_view and conversion hits to analytics.google.com, the doubleclick
  // stats host, and google.com/g/collect. Those three were being blocked,
  // which is silent: no error surfaces anywhere except the browser console.
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com https://www.googletagmanager.com https://analytics.ahrefs.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://ad.doubleclick.net https://google.com https://connect.facebook.net https://www.facebook.com https://api.mapbox.com https://*.supabase.co",
  "frame-src 'self' https://www.googletagmanager.com https://www.facebook.com https://td.doubleclick.net",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.mapbox.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
