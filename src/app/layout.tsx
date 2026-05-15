import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Anthony Stolp · Greater Milwaukee Realtor",
  description:
    "Honest guidance for buyers and sellers across southeast Wisconsin: Ozaukee, Washington, Waukesha, Sheboygan and the Greater Milwaukee area. Find where you belong.",
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
