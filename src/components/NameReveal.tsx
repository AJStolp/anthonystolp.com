"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Swap WORDMARK to "HEARTH" / "ROOTED" / "DWELL" / "HOME" / "BELONG" etc.
const WORDMARK = "BELONG";

const HOUSE_IMAGE = "/images/hero-alpha.png";

export function NameReveal() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // BELONG rises from below, blurry → sharp
      gsap.fromTo(
        textRef.current,
        {
          yPercent: 70,
          opacity: 0,
          scale: 1.15,
          filter: "blur(28px)",
        },
        {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          ease: "expo.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            end: "top 10%",
            scrub: 1.2,
          },
        },
      );

      // House inside the letters parallaxes subtly
      gsap.fromTo(
        ".wordmark-fill",
        { backgroundPositionY: "40%" },
        {
          backgroundPositionY: "70%",
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        },
      );

      gsap.from(captionRef.current, {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        scrollTrigger: {
          trigger: captionRef.current,
          start: "top 85%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[48vh] w-full flex-col items-center justify-center overflow-hidden bg-cream py-12 md:min-h-[80vh] md:py-24"
    >
      {/* BELONG wordmark — house image clipped to the letterforms */}
      <div
        ref={textRef}
        className="relative z-10 w-full px-4 text-center will-change-transform"
      >
        <h2 className="font-display font-bold leading-[0.85] tracking-[-0.05em]">
          <span
            className="wordmark-fill block bg-clip-text bg-[length:100%_auto] text-transparent"
            style={{
              fontSize: "clamp(2.5rem, 17vw, 20rem)",
              backgroundImage: `url(${HOUSE_IMAGE})`,
              backgroundPosition: "center 55%",
              backgroundRepeat: "no-repeat",
            }}
          >
            {WORDMARK}
          </span>
        </h2>
        <span className="mx-auto mt-6 block h-[2px] w-32 bg-ink/40 md:mt-8 md:w-48" />
      </div>

      <div
        ref={captionRef}
        className="relative z-10 mt-10 flex flex-col items-center gap-3 px-6 text-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.32em] text-ink/60 sm:tracking-[0.38em]">
          <span>Anthony Stolp</span>
          <span aria-hidden>·</span>
          <span>Realtor</span>
          <span aria-hidden>·</span>
          <span>Greater Milwaukee</span>
        </div>
        <p className="max-w-md px-2 text-sm leading-[1.7] text-ink-soft">
          Belonging starts with the right address. Let&apos;s find yours.
        </p>
      </div>
    </section>
  );
}
