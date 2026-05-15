"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

const EMAIL = "anthony@exsellexperts.com";
const SCROLL_THRESHOLD = 80;

export function Nav() {
  const lastY = useRef(0);
  const ticking = useRef(false);
  const [hidden, setHidden] = useState(false);
  const [withBg, setWithBg] = useState(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const goingDown = y > lastY.current;

        if (y < SCROLL_THRESHOLD) {
          setHidden(false);
          setWithBg(false);
        } else if (goingDown) {
          setHidden(true);
        } else {
          setHidden(false);
          setWithBg(true);
        }

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        withBg
          ? "bg-ink/70 text-cream backdrop-blur-md"
          : "mix-blend-difference text-white"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <Link
          href="/"
          className="font-display text-[15px] font-medium uppercase tracking-[0.32em]"
        >
          Anthony Stolp
        </Link>

        <p className="hidden text-[10px] font-medium uppercase tracking-[0.38em] md:block">
          Ozaukee &middot; Washington &middot; Waukesha &middot; Sheboygan
        </p>

        <a
          href={`mailto:${EMAIL}`}
          className="flex items-center gap-2 text-[12px] tracking-[0.04em] transition-opacity hover:opacity-70"
        >
          <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{EMAIL}</span>
        </a>
      </div>
    </header>
  );
}

