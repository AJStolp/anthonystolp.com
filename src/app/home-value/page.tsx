import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HomeValueFunnel } from "@/components/HomeValueFunnel";

export const metadata: Metadata = {
  title: "What's your home worth?",
  description:
    "Free, personalized home value estimate for southeast Wisconsin homes. An honest range, emailed to you within 24 hours by Anthony Stolp.",
  alternates: { canonical: "/home-value" },
  openGraph: {
    title: "What's your home worth? · Anthony Stolp",
    description:
      "Free, personalized home value estimate. An honest range, emailed within 24 hours.",
    url: "/home-value",
  },
};

export default function HomeValuePage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="relative w-full overflow-x-hidden">
        <Nav />
        <HomeValueFunnel />
        <Footer />
      </main>
    </>
  );
}
