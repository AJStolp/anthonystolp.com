"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SkyBackdrop } from "./SkyBackdrop";
import { CloudBank } from "./CloudBank";
import { HeroHouse } from "./HeroHouse";

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const houseRef = useRef<HTMLDivElement | null>(null);
  const cloudBankRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // ─── Initial entry animations (run once on page load) ───────────────
      const entry = gsap.timeline({ defaults: { ease: "expo.out" } });
      entry
        .from(".hero-line", { yPercent: 110, duration: 1.6, stagger: 0.1 }, 0.25)
        .from(".hero-sub", { y: 14, opacity: 0, duration: 1.2 }, 0.7)
        .from(".hero-cta", { y: 14, opacity: 0, duration: 1.2 }, 0.85)
        .from(houseRef.current, { y: 60, opacity: 0, scale: 0.96, duration: 1.8 }, 0.3)
        .from(cloudBankRef.current, { y: 50, opacity: 0, duration: 2 }, 0.5);

      // ─── Scroll-driven choreography (one timeline, one trigger, reversible) ───
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // 0 → 0.55 : gentle parallax (house drifts up & scales subtly, cloud bank drifts)
      scrollTl
        .to(houseRef.current, { y: -50, scale: 1.04, ease: "none" }, 0)
        .to(cloudBankRef.current, { y: 60, ease: "none" }, 0)
        .to(headlineRef.current, { y: -20, opacity: 0.7, ease: "none" }, 0);

      // 0.55 → 1.0 : full exit — headline + house + clouds + sky lift and fade out
      scrollTl
        .to(houseRef.current, { y: -180, opacity: 0, ease: "none" }, 0.55)
        .to(cloudBankRef.current, { y: 120, opacity: 0, ease: "none" }, 0.55)
        .to(headlineRef.current, { y: -60, opacity: 0, ease: "none" }, 0.45)
        .to(skyRef.current, { opacity: 0, ease: "none" }, 0.4);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-dvh min-h-[780px] w-full flex-col items-center overflow-hidden"
    >
      <div ref={skyRef} className="absolute inset-0 will-change-[opacity]">
        <SkyBackdrop />
      </div>

      {/* Headline */}
      <div
        ref={headlineRef}
        className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-[18vh] text-center will-change-transform md:pt-[16vh]"
      >
        <h1 className="font-display text-ink">
          <span className="block overflow-hidden whitespace-nowrap text-[clamp(2.25rem,7vw,7rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
            <span className="hero-line inline-block">Find Where You Belong.</span>
          </span>
        </h1>
        <p className="hero-sub mt-5 whitespace-nowrap text-[15px] font-normal leading-[1.5] text-ink-soft md:text-[17px]">
          A clear path to find what&apos;s next.
        </p>
        <a
          href="#contact"
          className="hero-cta group mt-9 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-cream transition-all hover:bg-ink-soft"
        >
          Start the conversation
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </div>

      {/* House — bottom-anchored, sized to live BELOW the headline */}
      <div
        ref={houseRef}
        className="pointer-events-none absolute left-1/2 bottom-0 z-10 w-[78%] max-w-[1100px] -translate-x-1/2 will-change-transform"
      >
        <HeroHouse className="w-full" />
      </div>

      {/* Cloud bank — wraps the base of the house */}
      <CloudBank
        ref={cloudBankRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[30%] will-change-transform"
      />

    </section>
  );
}
