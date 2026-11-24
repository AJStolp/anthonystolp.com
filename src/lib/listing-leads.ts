// Buyer sign ups on the town and property pages (T-078, from the 2026-11-24
// handoff): a listing alert for a town, a saved home, and "homes like this
// one" from a sold or pending listing. Each asks only for an email, and each
// goes into Lofty tagged with what the visitor asked for, so Anthony can set
// up the saved search by hand. The forms promise only what he will do.

import type { LoftyLeadInput } from "@/lib/lofty";

export const LISTING_LEAD_SOURCES = [
  "listing-alert",
  "save-home",
  "similar-homes",
] as const;
export type ListingLeadSource = (typeof LISTING_LEAD_SOURCES)[number];

export function isListingLeadSource(source: string): source is ListingLeadSource {
  return (LISTING_LEAD_SOURCES as readonly string[]).includes(source);
}

export const PRICE_RANGES = [
  { value: "under-300k", label: "Under $300K" },
  { value: "300k-500k", label: "$300K to $500K" },
  { value: "500k-750k", label: "$500K to $750K" },
  { value: "750k-1m", label: "$750K to $1M" },
  { value: "1m-plus", label: "$1M+" },
] as const;
export type PriceRange = (typeof PRICE_RANGES)[number]["value"];

export const BEDS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
] as const;
export type Beds = (typeof BEDS)[number]["value"];

export const PRICE_RANGE_VALUES = PRICE_RANGES.map((p) => p.value) as [
  PriceRange,
  ...PriceRange[],
];
export const BEDS_VALUES = BEDS.map((b) => b.value) as [Beds, ...Beds[]];

export function priceRangeLabel(value: string): string {
  return PRICE_RANGES.find((p) => p.value === value)?.label ?? value;
}

export function bedsLabel(value: string): string {
  return BEDS.find((b) => b.value === value)?.label ?? value;
}

export type ListingLead = {
  source: string;
  email?: string | null;
  town?: string | null;
  priceRange?: string | null;
  beds?: string | null;
  propertySlug?: string | null;
  address?: string | null;
};

const LOFTY_SOURCE: Record<ListingLeadSource, string> = {
  "listing-alert": "Website Listing Alert",
  "save-home": "Website Saved Home",
  "similar-homes": "Website Similar Homes",
};

// The Lofty lead for a listing sign up, or null when it is not one or has no
// email. These forms ask for no name, and Lofty's lead has to be filed under
// one, so it takes the part of the email before the @ until Anthony learns
// the real one.
export function listingLoftyLead(lead: ListingLead): LoftyLeadInput | null {
  if (!isListingLeadSource(lead.source)) return null;
  const email = lead.email?.trim();
  const firstName = email?.split("@")[0];
  if (!email || !firstName) return null;

  const town = lead.town?.trim() || null;
  const address = lead.address?.trim() || lead.propertySlug || "a listing";
  const wants = [
    lead.priceRange ? priceRangeLabel(lead.priceRange) : null,
    lead.beds ? `${bedsLabel(lead.beds)} beds` : null,
  ]
    .filter(Boolean)
    .join(", ");

  let tag: string;
  let note: string;
  switch (lead.source) {
    case "listing-alert":
      tag = `Listing alert: ${town ?? "Ozaukee County"}`;
      note = `Asked for new ${town ?? "Ozaukee County"} listings first${
        wants ? ` (${wants})` : ""
      }. Set up their saved search.`;
      break;
    case "save-home":
      tag = `Saved home: ${address}`;
      note = `Saved ${address}. Send its details and similar homes nearby.`;
      break;
    case "similar-homes":
      tag = `Similar homes: ${address}`;
      note = `Asked for homes like ${address}. Send similar listings nearby.`;
      break;
  }

  return {
    firstName,
    email,
    source: LOFTY_SOURCE[lead.source],
    tags: ["Buyer", tag],
    note,
  };
}
