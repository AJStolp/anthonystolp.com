"use client";

import { useEffect, useRef } from "react";
import { ListingAlertCard } from "@/components/ListingAlertCard";
import { TownTiles } from "@/components/TownTiles";
import { ALERT_TOWNS } from "@/lib/alert-towns";
import { track } from "@/lib/track";

// "Homes for sale now", right under the homepage hero (T-089). The hero's
// "See homes for sale" button is a plain href="#homes" that lands here.
export function HomesForSale() {
  const rootRef = useRef<HTMLElement | null>(null);
  // Once a page view. The ref survives React's dev double run of effects, and
  // a new visit to the page mounts a new component, so it counts again.
  const seenRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (seenRef.current || !entries.some((e) => e.isIntersecting)) return;
      seenRef.current = true;
      observer.disconnect();
      track({
        event: "home_tiles_view",
        properties: { page_path: window.location.pathname },
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      id="homes"
      aria-labelledby="homes-heading"
      className="scroll-mt-20 border-b border-ink/10 bg-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <h2
          id="homes-heading"
          className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink"
        >
          Homes for sale now
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink/70">
          Every active home on the MLS, no sign up needed. Pick a town.
        </p>

        <TownTiles placement="home_tiles" />

        <p className="mt-14 font-display text-xl font-semibold tracking-[-0.01em] text-ink">
          Want new listings in your town sent to you first?
        </p>
        {/* The alert card with a town dropdown (T-095). Its own top margin
            is pulled in so it sits under the line above. */}
        <div className="[&>section]:mt-5">
          <ListingAlertCard town="Ozaukee County" towns={ALERT_TOWNS} />
        </div>
      </div>
    </section>
  );
}
