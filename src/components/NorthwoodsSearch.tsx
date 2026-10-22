"use client";

import { useState } from "react";
import { SearchGate } from "@/components/SearchGate";
import { NORTHWOODS_SOURCES } from "@/lib/northwoods";

const EXSELL_REDIRECT =
  "https://exsellexperts.com/anthony-stolp/?utm_source=anthonystolp&utm_medium=referral&utm_campaign=northwoods-search";

export function NorthwoodsSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex w-full items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-cream transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:w-auto"
      >
        See active listings
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
      <SearchGate
        open={open}
        onClose={() => setOpen(false)}
        redirectUrl={EXSELL_REDIRECT}
        source={NORTHWOODS_SOURCES.search}
        campaignContext={{ niche_slug: "northwoods" }}
      />
    </>
  );
}
