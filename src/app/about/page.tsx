import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { OG_IMAGES } from "@/lib/og";

export const metadata: Metadata = {
  title: "About Anthony Stolp · Ozaukee County Realtor",
  description:
    "Solo real estate agent serving Ozaukee County, Wisconsin. Cedarburg, Thiensville, Mequon, Grafton, Port Washington, Saukville. Honest pricing, no scripts.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Anthony Stolp · Ozaukee County Realtor",
    description:
      "Solo real estate agent serving Ozaukee County, Wisconsin. Honest pricing, no scripts.",
    type: "profile",
    images: OG_IMAGES,
  },
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="min-h-dvh bg-cream pt-28 pb-24 text-ink md:pt-36">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/65">
            About
          </p>

          <h1 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            A local agent who works the way you want a local agent to work.
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="aspect-[4/5] w-full bg-ink/5">
                {/* Replace with your portrait at /public/images/aj.jpg */}
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-ink-soft/50">
                Anthony Stolp · WI #114204-94
              </p>
            </div>

            <div className="space-y-6 text-[15px] leading-[1.75] text-ink-soft md:col-span-2 md:text-[16px]">
              <p>
                I am Anthony Stolp. I am a solo agent at ExSell Experts, a team
                under Epique Realty out of Germantown, Wisconsin. My personal
                practice is focused on the Ozaukee County north shore:
                Cedarburg, Thiensville, Mequon, Grafton, Port Washington, and
                Saukville. I grew up around here and I work here every week.
              </p>
              <p>
                The real estate industry has a fluff problem. Most agents lead
                with vague platitudes and scripts. I do not. When you ask me
                what your home is worth, you get a real range with the reasons
                I picked it, sent within 24 hours. When I show you a listing, I
                tell you what is wrong with it before I tell you what is right.
                When the timing or pricing is off, I say so.
              </p>
              <p>
                The site you are on is something I am building so the people I
                work with have actual tools, not lead magnets dressed up to look
                like tools. Free instant home value. Address-aware search. New
                listing alerts that mean something. A direct line to me when you
                want to talk to a human instead of a chatbot.
              </p>
              <p>
                If that fits the way you want to work, get in touch. If it does
                not, no hard feelings.
              </p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/home-value"
              className="group inline-flex items-center justify-between border border-ink bg-ink px-6 py-5 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:bg-transparent hover:text-ink"
            >
              <span>Get my home value</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/#contact"
              className="group inline-flex items-center justify-between border border-ink px-6 py-5 text-[11px] uppercase tracking-[0.32em] text-ink transition-all hover:bg-ink hover:text-cream"
            >
              <span>Send me a note</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
