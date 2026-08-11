"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SearchGate } from "@/components/SearchGate";
import { HOME_VALUE_ENABLED, SELL_FALLBACK_HREF } from "@/lib/feature-flags";

const SEARCH_REDIRECT_URL =
  "https://exsellexperts.com/anthony-stolp/?utm_source=anthonystolp&utm_medium=referral&utm_campaign=search-cta";

const services: {
  n: string;
  word: string;
  short: string;
  points: string[];
  cta: string;
  image: string;
  href: string;
}[] = [
  {
    n: "01",
    word: "Buy",
    short: "Buy without overpaying.",
    points: [
      "Inspection coordination",
      "Appraisal and financing timeline",
      "Offer strategy and negotiation",
    ],
    cta: "Learn more",
    image: "/images/services/buy.webp",
    href: "/buy",
  },
  {
    n: "02",
    word: "Sell",
    short: "Sell on your terms.",
    points: [
      "Pricing built on local comps",
      "Staging and prep guidance",
      "Photography that sells",
    ],
    cta: HOME_VALUE_ENABLED ? "Get your value" : "Learn more",
    image: "/images/services/home.jpeg",
    href: HOME_VALUE_ENABLED ? "/home-value" : SELL_FALLBACK_HREF,
  },
  {
    n: "03",
    word: "Search",
    short: "Find the one that fits.",
    points: [
      "Every active MLS listing",
      "Filter by town, price, and beds",
      "Save the ones you like",
    ],
    cta: "Browse listings",
    image: "/images/services/aerial.jpeg",
    href: SEARCH_REDIRECT_URL,
  },
];

export function Approach() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [searchGateOpen, setSearchGateOpen] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".svc-fade",
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="approach"
      ref={sectionRef}
      aria-labelledby="approach-heading"
      className="border-b border-ink/10 bg-cream"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/55">
          How I work
        </p>
        <h2
          id="approach-heading"
          className="mt-3 max-w-xl font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        >
          Three ways to start.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-12 md:grid-cols-3 md:gap-8">
          {services.map((s) => {
            const isSearchGate = s.word === "Search";
            const isExternal = s.href.startsWith("http");
            return (
              <a
                key={s.word}
                href={s.href}
                target={isExternal && !isSearchGate ? "_blank" : undefined}
                rel={
                  isExternal && !isSearchGate ? "noopener noreferrer" : undefined
                }
                onClick={
                  isSearchGate
                    ? (e) => {
                        e.preventDefault();
                        setSearchGateOpen(true);
                      }
                    : undefined
                }
                className="svc-fade group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_18px_50px_-14px_rgba(26,28,28,0.3)] transition-shadow duration-500 hover:shadow-[0_26px_64px_-14px_rgba(26,28,28,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
              >
                {/* Photo — badge straddles the lower edge, so it lives outside
                    the overflow-hidden wrapper that clips the hover zoom. */}
                <div className="relative w-full">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-ink/5">
                    <Image
                      src={s.image}
                      alt=""
                      width={640}
                      height={480}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <span
                    aria-hidden
                    className="absolute -bottom-5 left-6 grid h-10 w-10 place-items-center rounded-full bg-ink text-[11px] font-semibold tracking-[0.08em] text-white ring-4 ring-white"
                  >
                    {s.n}
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-6 pb-6 pt-9">
                  <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink">
                    {s.word}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-ink/70">
                    {s.short}
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-ink/10 pt-5">
                    {s.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-ink-soft"
                      >
                        <Check
                          aria-hidden
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                          strokeWidth={2.5}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-6 inline-flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/70 transition-colors group-hover:text-accent">
                    {s.cta}
                    <ArrowRight
                      aria-hidden
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      strokeWidth={2}
                    />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <SearchGate
        open={searchGateOpen}
        onClose={() => setSearchGateOpen(false)}
        redirectUrl={SEARCH_REDIRECT_URL}
      />
    </section>
  );
}
