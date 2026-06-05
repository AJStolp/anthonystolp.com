"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchGate, type CampaignContext } from "@/components/SearchGate";

const EXSELL_REDIRECT =
  "https://exsellexperts.com/?utm_source=anthonystolp&utm_medium=referral&utm_campaign=niche-search";

type Props = {
  intent: "buy" | "sell";
  slug: string;
};

export function NicheCTA({ intent, slug }: Props) {
  const [open, setOpen] = useState(false);

  if (intent === "sell") {
    return (
      <Link
        href={`/home-value?utm_source=niche&utm_campaign=${slug}`}
        className="group inline-flex items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.32em] text-cream transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        Get my home value
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>
    );
  }

  const campaignContext: CampaignContext = { niche_slug: slug };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.32em] text-cream transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
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
        campaignContext={campaignContext}
      />
    </>
  );
}
