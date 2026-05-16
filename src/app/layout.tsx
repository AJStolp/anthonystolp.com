import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/LenisProvider";

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
const TAGLINE = "Greater Milwaukee Realtor";
const DESCRIPTION =
  "Honest guidance for buyers and sellers across southeast Wisconsin: Ozaukee, Washington, Waukesha, Sheboygan and the Greater Milwaukee area. Find where you belong.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${TAGLINE}`,
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
    title: `${SITE_NAME} · ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${TAGLINE}`,
    description: DESCRIPTION,
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
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
