import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/LenisProvider";
import { Pixels } from "@/components/Pixels";
import { TrackingInit } from "@/components/TrackingInit";
import { OG_IMAGES } from "@/lib/og";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://anthonystolp.com";
const SITE_NAME = "Anthony Stolp";
// A DR 0 domain cannot win "Greater Milwaukee realtor"; "Cedarburg realtor"
// and "Ozaukee County realtor" are winnable and are where Anthony works.
// The search title leads with the place, the social title with the name.
const TAGLINE = "Cedarburg and Ozaukee County Realtor";
// Kept under 160 characters so Google shows it whole.
const DESCRIPTION =
  "Buying or selling in Cedarburg, Mequon, Grafton, or anywhere in Ozaukee County? Straight answers, real local comps, and a free home value from Anthony Stolp.";
const SOCIAL_TITLE = `${SITE_NAME} · ${TAGLINE}`;
const SOCIAL_DESCRIPTION =
  "Straight answers, real local comps, and a free home value for Cedarburg, Mequon, Grafton, Port Washington, and the rest of Ozaukee County.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${TAGLINE} · ${SITE_NAME}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: "ExSell Experts at Epique Realty",
  keywords: [
    "Milwaukee realtor",
    "Greater Milwaukee real estate",
    "Ozaukee County realtor",
    "Washington County WI realtor",
    "Waukesha County realtor",
    "Sheboygan County realtor",
    "Germantown WI real estate",
    "buy a home Milwaukee",
    "sell a home Milwaukee",
    "Wisconsin realtor",
    "Anthony Stolp",
    "ExSell Experts",
    "Epique Realty",
  ],
  category: "real estate",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: OG_IMAGES,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Google Search Console domain/URL-prefix verification. Set
  // GOOGLE_SITE_VERIFICATION to the token GSC gives you; renders the
  // <meta name="google-site-verification"> tag. Undefined → nothing rendered.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c1c" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-dvh bg-cream text-ink">
        <Pixels />
        <TrackingInit />
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
