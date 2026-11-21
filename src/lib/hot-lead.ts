// Home value leads and the hot ones among them (v4 handoff, 2026-11-20; AJ
// chose an email alert now and a Hot tag in Lofty, T-073).
//
// A seller who says 1 to 3 months should hear from Anthony within minutes.
// Their lead alert email says so in its subject, and the lead goes into Lofty
// tagged Hot, where a Lofty new lead text alert filtered on that tag can text
// Anthony. The alert goes only to Anthony, never to the lead.

import { COMMUNITIES } from "@/lib/communities";
import type { LoftyLeadInput } from "@/lib/lofty";

export type HomeValueLead = {
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  timeframe?: string | null;
  address?: string | null;
  city?: string | null;
  message?: string | null;
  bndryiqEstimate?: { low?: number; high?: number } | null;
};

const TIMEFRAME_WORDS: Record<string, string> = {
  "1-3mo": "1 to 3 months",
  "3-6mo": "3 to 6 months",
  "6-12mo": "6 to 12 months",
  curious: "Just curious",
  refinancing: "Refinancing",
};

// The towns the site serves by name: the Ozaukee communities, and the
// Washington County towns named on the homepage.
const TOWNS = [
  ...COMMUNITIES.map((c) => c.name).filter((n) => !n.endsWith("County")),
  "West Bend",
  "Hartford",
  "Germantown",
  "Jackson",
  "Slinger",
];

export function isHotLead(lead: Pick<HomeValueLead, "source" | "timeframe">): boolean {
  return lead.source === "home-value" && lead.timeframe === "1-3mo";
}

// The town a typed address names, or null. A city field, when a form sends
// one, wins over guessing from the address.
export function townOf(lead: Pick<HomeValueLead, "address" | "city">): string | null {
  if (lead.city?.trim()) return lead.city.trim();
  const address = lead.address ?? "";
  return TOWNS.find((t) => new RegExp(`\\b${t}\\b`, "i").test(address)) ?? null;
}

// Subject of the lead alert email to Anthony. A hot lead leads with HOT and
// carries what he needs to call from the notification alone.
export function alertSubject(lead: HomeValueLead, plainSubject: string): string {
  if (!isHotLead(lead)) return plainSubject;
  const who = lead.name?.trim() || lead.email || "anonymous";
  const where = lead.address?.trim() || "no address";
  return `HOT: 1 to 3 months. ${who}, ${where}, ${lead.phone?.trim() || "no phone"}`;
}

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// The Lofty lead for a home value request, or null without a name to file it
// under.
export function homeValueLoftyLead(lead: HomeValueLead): LoftyLeadInput | null {
  const fullName = (lead.name ?? "").trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  if (!firstName) return null;

  const town = townOf(lead);
  const timeframe = lead.timeframe ? (TIMEFRAME_WORDS[lead.timeframe] ?? lead.timeframe) : null;
  const tags = ["Seller", "Home Value"];
  if (town) tags.push(town);
  if (timeframe) tags.push(timeframe);
  if (isHotLead(lead)) tags.push("Hot");

  const note = [
    `${isHotLead(lead) ? "Hot home value lead. " : ""}Home value request for ${lead.address?.trim() || "an address not given"}.`,
    timeframe ? `Thinking about selling: ${timeframe}.` : null,
    typeof lead.bndryiqEstimate?.low === "number" && typeof lead.bndryiqEstimate.high === "number"
      ? `bndryiq range: ${money(lead.bndryiqEstimate.low)} to ${money(lead.bndryiqEstimate.high)}.`
      : null,
    lead.message?.trim() ? `Notes: ${lead.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    firstName,
    lastName: rest.join(" ") || null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    source: "Website Home Value",
    tags,
    note,
  };
}
