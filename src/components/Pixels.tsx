import Script from "next/script";

// Renders ad-platform pixels. Both are env-gated: absence of env var → no script.
// Configure conversion / audience definitions in the ad platform UIs against
// the event names emitted by src/lib/track.ts.
export function Pixels() {
  const gadsId = process.env.NEXT_PUBLIC_GADS_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {gadsId ? (
        <>
          <Script
            id="gads-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${gadsId}`}
            strategy="afterInteractive"
          />
          <Script id="gads-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gadsId}');
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
    </>
  );
}
