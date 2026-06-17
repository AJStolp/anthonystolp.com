// Map a niche-page geo to its Redfin market stats, for the market-snapshot
// block on /search/[slug]. Reuses the market_stats rows the monthly Redfin
// cron already ingests — no extra fetching. Degrades to null when we have no
// data for the geo so the page can simply omit the block.

import { getSupabase } from "../supabase-server";

// Niche-page geo string -> Redfin zip(s) it covers (single-tenant: AJ's areas).
// Mequon spans two zips; the county rolls up all six.
const GEO_ZIPS: Record<string, string[]> = {
  "Cedarburg, WI": ["53012"],
  "Grafton, WI": ["53024"],
  "Mequon, WI": ["53092", "53097"],
  "Thiensville, WI": ["53092"],
  "Port Washington, WI": ["53074"],
  "Saukville, WI": ["53080"],
  "Ozaukee County, WI": ["53012", "53024", "53092", "53097", "53074", "53080"],
};

type StatRow = {
  zip: string;
  month: string;
  median_price: number | null;
  median_dom: number | null;
  inventory_count: number | null;
  sales_count: number | null;
  yoy_pct: number | null;
};

export type GeoSnapshot = {
  periodLabel: string; // "March 2026" — anchor of Redfin's 90-day rolling window
  zipCount: number;
  medianPrice: number | null; // single-zip geos: the exact median
  medianPriceLow: number | null; // multi-zip geos: range across zips
  medianPriceHigh: number | null;
  medianDom: number | null; // avg across zips
  inventory: number | null; // sum across zips
  homesSold: number | null; // sum across zips
  yoyPct: number | null; // single-zip only (aggregating a YoY is misleading)
};

export async function getGeoSnapshot(
  geo: string | null,
): Promise<GeoSnapshot | null> {
  if (!geo) return null;
  const zips = GEO_ZIPS[geo];
  if (!zips || zips.length === 0) return null;

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return null; // build-time / no DB env — page omits the block
  }

  const { data, error } = await supabase
    .from("market_stats")
    .select("zip,month,median_price,median_dom,inventory_count,sales_count,yoy_pct")
    .in("zip", zips)
    .order("month", { ascending: false });
  if (error || !data || data.length === 0) return null;

  // Keep the most recent row per zip (query is already month-desc).
  const latestByZip = new Map<string, StatRow>();
  for (const r of data as StatRow[]) {
    if (!latestByZip.has(r.zip)) latestByZip.set(r.zip, r);
  }
  const rows = [...latestByZip.values()];
  if (rows.length === 0) return null;

  const nums = (pick: (r: StatRow) => number | null) =>
    rows.map(pick).filter((n): n is number => n != null);
  const sum = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) : null);
  const avg = (a: number[]) =>
    a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;

  const medians = nums((r) => r.median_price);
  const single = rows.length === 1;
  const latestMonth = rows.map((r) => r.month).sort().at(-1)!;

  return {
    periodLabel: new Date(latestMonth).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    zipCount: rows.length,
    medianPrice: single ? (medians[0] ?? null) : null,
    medianPriceLow: single || !medians.length ? null : Math.min(...medians),
    medianPriceHigh: single || !medians.length ? null : Math.max(...medians),
    medianDom: avg(nums((r) => r.median_dom)),
    inventory: sum(nums((r) => r.inventory_count)),
    homesSold: sum(nums((r) => r.sales_count)),
    yoyPct: single ? (rows[0]!.yoy_pct ?? null) : null,
  };
}
