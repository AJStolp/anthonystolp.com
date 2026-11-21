import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { OG_IMAGES } from "@/lib/og";
import { getAgentProfile } from "@/lib/agent-profile";
import { telHref } from "@/lib/phone";

export const metadata: Metadata = {
  title: "About · Ozaukee County Realtor",
  description:
    "Anthony Stolp, Realtor serving Cedarburg, Ozaukee County, and nearby Washington County. Honest pricing, no scripts. Call or text (262) 483-7932.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Anthony Stolp · Ozaukee County Realtor",
    description:
      "Anthony Stolp, Realtor serving Cedarburg, Ozaukee County, and nearby Washington County. Honest pricing, no scripts. Call or text (262) 483-7932.",
    type: "profile",
    images: OG_IMAGES,
  },
};

export default function AboutPage() {
  const cell = getAgentProfile().mobilePhone;
  return (
    <>
      <Nav />
      <main className="min-h-dvh bg-white pt-28 pb-24 text-ink md:pt-36">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-ink-soft/70">
            About
          </p>

          <h1 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
            Straight answers from a local agent who works the North Shore every
            week.
          </h1>

          <div className="mt-12 grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            <div className="md:order-2">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/anthony-headshot.png"
                  alt="Anthony Stolp, Realtor"
                  className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain object-bottom"
                />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-ink-soft/70">
                Anthony Stolp · WI #114204-94
              </p>
            </div>

            <div className="space-y-6 text-[15px] leading-[1.75] text-ink-soft md:order-1 md:text-[16px]">
              <p>
                I&apos;m Anthony Stolp, a Realtor based out of Germantown. My
                focus is the Ozaukee County North Shore: Cedarburg, Thiensville,
                Mequon, Grafton, Port Washington, and Saukville, plus nearby
                Washington County towns like West Bend, Hartford, Germantown,
                Jackson, and Slinger. I grew up around here and I work here
                every week.
              </p>
              <p>
                You work directly with me from start to finish. I have the
                ExSell Experts | Epique Realty team behind me when I need
                backup, but you work with me.
              </p>
              <p>
                The real estate industry has a fluff problem. Most agents lead
                with vague platitudes and scripts. I don&apos;t. When you ask me
                what your home is worth, you get a real range with the reasons
                I picked it, sent within 24 hours. When I show you a listing, I
                tell you what&apos;s wrong with it before I tell you what&apos;s
                right.
                When the timing or pricing is off, I say so.
              </p>
              <p>
                The site you&apos;re on is something I&apos;m building so the people I
                work with have actual tools, not lead magnets dressed up to look
                like tools. A free home value, personally prepared within 24
                hours. New listing alerts that mean something. A direct line to
                me when you want to talk to a human instead of a chatbot.
              </p>
              <p>
                If that fits the way you want to work, get in touch. If it
                doesn&apos;t, no hard feelings.
              </p>
              <p>
                Call or text me at{" "}
                <a
                  href={telHref(cell)}
                  className="text-ink underline underline-offset-4"
                >
                  {cell}
                </a>
                . You&apos;ll get me, not a call center. Or send a note below.
              </p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/home-value"
              className="group inline-flex items-center justify-between border border-ink bg-ink px-6 py-5 text-[11px] uppercase tracking-[0.32em] text-white transition-all hover:bg-transparent hover:text-ink"
            >
              <span>
                Ask for my home value
              </span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/#contact"
              className="group inline-flex items-center justify-between border border-ink px-6 py-5 text-[11px] uppercase tracking-[0.32em] text-ink transition-all hover:bg-ink hover:text-white"
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
