"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Theme = "ink" | "cream";

const services: {
  n: string;
  word: string;
  short: string;
  body: string;
  image: string;
  href: string;
  theme: Theme;
}[] = [
  {
    n: "01",
    word: "Buy",
    short: "Buy without overpaying.",
    body:
      "Inspections, appraisal, negotiation. I take care of the heavy lifting so you can focus on the move.",
    image: "/images/services/buy.webp",
    href: "/?intent=buy#contact",
    theme: "cream",
  },
  {
    n: "02",
    word: "Sell",
    short: "Sell on your terms.",
    body:
      "Honest pricing, real staging, and photography that actually sells. A process built to bring the right buyer to your door faster.",
    image: "/images/services/home.jpeg",
    href: "/?intent=sell#contact",
    theme: "ink",
  },
  {
    n: "03",
    word: "Search",
    short: "Find the one that fits.",
    body:
      "There’s a home out there for the life you’re building. I’ll help you find it across every neighborhood in Greater Milwaukee, including the ones that haven’t hit the market yet.",
    image: "/images/services/aerial.jpeg",
    href: "/?intent=exploring#contact",
    theme: "cream",
  },
];

// Cream and ink as space-separated RGB triplets (for use inside rgb(... / alpha))
const CREAM_RGB = "250 248 242";
const INK_RGB = "26 28 28";

export function Approach() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blindRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backdropRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(".svc-fade", {
        y: 40,
        opacity: 0,
        duration: 1.0,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
      });

      // All blinds start closed; all backdrops start hidden.
      blindRefs.current.forEach((blind) => {
        if (blind) gsap.set(blind, { scaleY: 1, transformOrigin: "top" });
      });
      backdropRefs.current.forEach((bd) => {
        if (bd) gsap.set(bd, { opacity: 0 });
      });
      // Initial text color = whatever each inactive row needs for contrast.
      rowRefs.current.forEach((row, i) => {
        if (!row) return;
        const isInk = services[i].theme === "ink";
        row.style.setProperty("--row-text-rgb", isInk ? CREAM_RGB : INK_RGB);
      });

      // Single coordinator: the row containing the viewport center is "active".
      // Active row blind opens + dark alpha backdrop fades in; text flips cream.
      let prevActive = -2;
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: () => {
          const vCenter = window.innerHeight / 2;
          let activeIdx = -1;
          rowRefs.current.forEach((row, i) => {
            if (!row) return;
            const r = row.getBoundingClientRect();
            if (r.top <= vCenter && r.bottom >= vCenter) activeIdx = i;
          });
          if (activeIdx === prevActive) return;
          prevActive = activeIdx;
          rowRefs.current.forEach((row, i) => {
            if (!row) return;
            const isActive = i === activeIdx;
            const isInk = services[i].theme === "ink";

            // Text color: active = always cream (over dark backdrop); inactive = contrasts with blind
            const useInkText = !isActive && !isInk;
            row.style.setProperty(
              "--row-text-rgb",
              useInkText ? INK_RGB : CREAM_RGB,
            );

            const blind = blindRefs.current[i];
            if (blind) {
              gsap.to(blind, {
                scaleY: isActive ? 0 : 1,
                duration: 0.55,
                ease: "power2.out",
                overwrite: true,
              });
            }
            const backdrop = backdropRefs.current[i];
            if (backdrop) {
              gsap.to(backdrop, {
                opacity: isActive ? 1 : 0,
                duration: 0.55,
                ease: "power2.out",
                overwrite: true,
              });
            }
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="approach"
      ref={sectionRef}
      aria-labelledby="approach-heading"
      className="relative w-full bg-cream text-ink"
    >
      <h2 id="approach-heading" className="sr-only">
        How I work with buyers and sellers
      </h2>
      {/* Service rows — alternating ink/cream themed blinds */}
      <div>
        {services.map((s, i) => {
          const isInk = s.theme === "ink";
          const isExternal = s.href.startsWith("http");
          return (
          <div
            key={s.word}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className="relative min-h-[520px] overflow-hidden md:min-h-[640px]"
          >
            {/* Background image — spans full row width */}
            <div className="pointer-events-none absolute inset-0">
              <Image
                src={s.image}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-65"
              />
            </div>

            {/* Blind — color set by row's theme; retracts when row is active */}
            <div
              ref={(el) => {
                blindRefs.current[i] = el;
              }}
              aria-hidden
              className={`pointer-events-none absolute inset-0 will-change-transform ${
                isInk ? "bg-ink" : "bg-cream"
              }`}
            />

            {/* Content — text color flips via --row-text-rgb; ink/alpha backdrop appears on reveal */}
            <a
              href={s.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="svc-fade group relative z-10 grid grid-cols-1 items-center gap-8 px-6 py-14 md:grid-cols-12 md:px-16 md:py-20 lg:px-24"
            >
              <div className="md:col-span-5">
                <div className="relative inline-block max-w-md px-5 py-5">
                  {/* Reveal-only backdrop */}
                  <div
                    ref={(el) => {
                      backdropRefs.current[i] = el;
                    }}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-ink/55 backdrop-blur-sm"
                  />
                  <div className="relative" style={{ transition: "color 0.4s ease" }}>
                    <p
                      className="text-[11px] font-medium uppercase tracking-[0.32em]"
                      style={{ color: "rgb(var(--row-text-rgb) / 0.55)" }}
                    >
                      {s.n}
                    </p>
                    <p
                      className="mt-4 font-display text-lg font-medium leading-snug tracking-[-0.01em] md:text-xl"
                      style={{ color: "rgb(var(--row-text-rgb))" }}
                    >
                      {s.short}
                    </p>
                    <p
                      className="mt-3 hidden text-[14px] leading-[1.7] md:block"
                      style={{ color: "rgb(var(--row-text-rgb) / 0.78)" }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:col-span-7">
                <span
                  className="font-display font-semibold leading-none tracking-[-0.045em] underline underline-offset-[0.18em] decoration-1 transition-colors"
                  style={{
                    fontSize: "clamp(3.25rem, 10vw, 9rem)",
                    color: "rgb(var(--row-text-rgb))",
                    textDecorationColor: "rgb(var(--row-text-rgb) / 0.4)",
                  }}
                >
                  {s.word}
                </span>
                <ArrowRight
                  className="h-10 w-10 shrink-0 transition-all duration-300 group-hover:translate-x-2 md:h-14 md:w-14"
                  style={{ color: "rgb(var(--row-text-rgb) / 0.65)" }}
                  strokeWidth={1.25}
                />
              </div>
            </a>
          </div>
          );
        })}
      </div>

      {/* Cream bottom band */}
      <div className="h-24 md:h-32" />
    </section>
  );
}

