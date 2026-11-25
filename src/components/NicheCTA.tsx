"use client";

import { SearchGate, useSearchGate, type CampaignContext } from "@/components/SearchGate";
import { listingSearchForSlug } from "@/lib/listing-search";

type Props = {
  intent: "buy" | "sell";
  slug: string;
  // Shown in the listings gate's heading. Omitted where there is no one town.
  town?: string;
};

export function NicheCTA({ intent, slug, town }: Props) {
  const search = listingSearchForSlug(slug);
  const gate = useSearchGate(search);

  // A seller types the address here, and /home-value starts its form with
  // it, so they never type it twice.
  if (intent === "sell") {
    return (
      <form
        action="/home-value"
        method="get"
        className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
      >
        <label htmlFor={`hv-address-${slug}`} className="sr-only">
          Your home address
        </label>
        <input
          id={`hv-address-${slug}`}
          name="address"
          required
          autoComplete="street-address"
          placeholder={town ? `Your ${town} address` : "Your home address"}
          className="min-w-0 flex-1 border border-ink/30 bg-white px-4 py-4 text-[15px] text-ink outline-none placeholder:text-ink/55 focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/60"
        />
        <input type="hidden" name="utm_source" value="niche" />
        <input type="hidden" name="utm_campaign" value={slug} />
        <button
          type="submit"
          className="group inline-flex items-center justify-center gap-3 whitespace-nowrap border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.32em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Ask for my home value
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </button>
      </form>
    );
  }

  const campaignContext: CampaignContext = { niche_slug: slug };

  return (
    <>
      <button
        type="button"
        onClick={gate.request}
        className="group inline-flex items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.32em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        See active listings
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
      <SearchGate
        open={gate.open}
        onClose={gate.close}
        search={search}
        campaignContext={campaignContext}
        town={town}
      />
    </>
  );
}
