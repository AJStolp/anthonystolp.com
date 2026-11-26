"use client";

import {
  listingSearchUrl,
  type ListingPlacement,
  type ListingSearch,
} from "@/lib/listing-search";
import { track } from "@/lib/track";

// A plain link to an AgentFire listing search, in the server HTML and in the
// same tab, so it works before hydration and with JavaScript off. The click
// is recorded and never stopped: no preventDefault, no email gate (T-088).
export function ListingSearchLink({
  search,
  placement,
  className,
  children,
}: {
  search: ListingSearch;
  placement: ListingPlacement;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={listingSearchUrl(search, placement)}
      onClick={() =>
        track({
          event: "search_outbound",
          properties: { town: search, source: "direct", placement },
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
