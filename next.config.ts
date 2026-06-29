import type { NextConfig } from "next";

// Pragmatic CSP. We rely on 'unsafe-inline'/'unsafe-eval' for scripts because
// Next hydration and the gtag/fbq inline init (src/components/Pixels.tsx) are
// inline, and a nonce-based policy is too invasive for this change. Third-party
// hosts below are the ones actually loaded: Google gtag/GTM + Analytics, Meta
// pixel (connect.facebook.net / facebook.com), Ahrefs analytics, Mapbox
// (api.mapbox.com), Unsplash images, and same-origin Supabase-backed APIs.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://analytics.ahrefs.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com https://api.mapbox.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://analytics.ahrefs.com https://connect.facebook.net https://www.facebook.com https://api.mapbox.com https://*.supabase.co",
  "frame-src 'self' https://www.facebook.com https://td.doubleclick.net",
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
