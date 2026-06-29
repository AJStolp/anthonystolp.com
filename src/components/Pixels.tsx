import Script from "next/script";

// Renders measurement + ad-platform tags. All env-gated: absence of env var →
// no script. GA4 (NEXT_PUBLIC_GA4_ID, "G-…") and Google Ads (NEXT_PUBLIC_GADS_ID,
// "AW-…") share one gtag.js load — gtag can config multiple destinations, so
// the funnel events mirrored to window.gtag in src/lib/track.ts reach both.
// Configure conversions / audiences in the platform UIs against those event names.
export function Pixels() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
  const gadsId = process.env.NEXT_PUBLIC_GADS_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const ahrefsKey = process.env.NEXT_PUBLIC_AHREFS_KEY;
  // Load the shared gtag.js once if either Google tag is configured.
  const gtagLoaderId = ga4Id || gadsId;

  return (
    <>
      {gtagLoaderId ? (
        <>
          <Script
            id="gtag-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagLoaderId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${ga4Id ? `gtag('config', '${ga4Id}');` : ""}
              ${gadsId ? `gtag('config', '${gadsId}');` : ""}
            `}
          </Script>
        </>
      ) : null}
      {metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${metaPixelId}');
            fbq('track','PageView');
          `}
        </Script>
      ) : null}
      {ahrefsKey ? (
        <Script
          id="ahrefs-analytics"
          src="https://analytics.ahrefs.com/analytics.js"
          data-key={ahrefsKey}
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
