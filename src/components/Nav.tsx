"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { HOME_VALUE_ENABLED } from "@/lib/feature-flags";

const SCROLL_THRESHOLD = 80;

const LINKS: { href: string; label: string }[] = [
  ...(HOME_VALUE_ENABLED ? [{ href: "/home-value", label: "Home Value" }] : []),
  { href: "/search/ozaukee-county-homes-for-sale", label: "Search" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  const lastY = useRef(0);
  const ticking = useRef(false);
  const [hidden, setHidden] = useState(false);
  const [withBg, setWithBg] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        } else if (goingDown && !mobileOpen) {
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
  }, [mobileOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${withBg || mobileOpen ? "bg-cream/95 text-ink backdrop-blur-md" : "bg-cream text-ink"}`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 md:px-12 md:py-5">
        <Link
          href="/"
          className="font-display text-[14px] font-semibold uppercase tracking-[0.28em] text-ink"
          onClick={() => setMobileOpen(false)}
        >
          Anthony Stolp
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/75 underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center text-ink md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-ink/10 bg-cream md:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-ink/5 last:border-b-0">
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-4 text-[12px] uppercase tracking-[0.28em] text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
