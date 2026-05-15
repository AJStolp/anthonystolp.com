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
      // Use fromTo with explicit end states so React Strict Mode double-invoke
      // can't leave elements stuck at the start state (opacity 0).
      const entry = gsap.timeline({ defaults: { ease: "expo.out" } });
      entry
        .fromTo(
          ".hero-line",
          { yPercent: 110 },
          { yPercent: 0, duration: 1.6, stagger: 0.1 },
          0.25,
        )
        .fromTo(
          ".hero-sub",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2 },
          0.7,
        )
        .fromTo(
          ".hero-cta",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2 },
          0.85,
        )
        .fromTo(
          houseRef.current,
          { y: 60, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 1.8 },
          0.3,
        )
        .fromTo(
          cloudBankRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 2 },
          0.5,
        );

      // ─── Scroll-driven choreography ──────────────────────────────────────
      // Wait for entry to settle before binding the scroll timeline so the two
      // don't fight over the same elements during the first scroll.
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.3,
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

      // Refresh ScrollTrigger after entry completes so the timeline picks up
      // accurate measurements (entry may have shifted layout via from-tweens).
      entry.eventCallback("onComplete", () => ScrollTrigger.refresh());
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-auto w-full flex-col items-center overflow-hidden pb-12 md:h-dvh md:min-h-[780px] md:pb-0"
    >
      <div ref={skyRef} className="absolute inset-0 will-change-[opacity]">
        <SkyBackdrop />
      </div>

      {/* Headline */}
      <div
        ref={headlineRef}
        className="relative z-30 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-24 text-center will-change-transform md:pt-[10vh]"
      >
        <h1 className="font-display text-ink">
          <span className="block overflow-hidden text-[clamp(2.25rem,7vw,7rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
            <span className="hero-line inline-block">Find Where You Belong.</span>
          </span>
        </h1>
        <p className="hero-sub mt-5 max-w-[28ch] text-[15px] font-normal leading-[1.5] text-ink-soft md:text-[17px]">
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

      {/* House — sits directly below headline on mobile with a small gap.
          On desktop, snaps back to absolute bottom-anchored so the cloud bank can wrap it. */}
      <div
        ref={houseRef}
        className="pointer-events-none relative z-10 mx-auto mt-8 w-[92%] max-w-[440px] will-change-transform md:absolute md:bottom-0 md:left-1/2 md:mt-0 md:w-[78%] md:max-w-[1100px] md:-translate-x-1/2"
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
