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

// Geos whose zip covers more than the town itself. Redfin publishes zips, not
// villages, so the snapshot names the area its numbers actually describe.
const ZIP_AREA: Record<string, { label: string; note: string }> = {
  "Thiensville, WI": {
    label: "Thiensville and Mequon (53092)",
    note: "Redfin reports the 53092 zip code, which covers Thiensville and much of Mequon, not the village alone.",
  },
};

type StatRow = {
  zip: string;
  month: string;
  median_price: number | null;
  median_dom: number | null;
  inventory_count: number | null;
  sales_count: number | null;
  yoy_pct: number | null;
  created_at: string;
};

export type GeoSnapshot = {
  periodLabel: string; // "October 2026": the last month of Redfin's rolling 3 month window
  zipCount: number;
  medianPrice: number | null; // single-zip geos: the exact median
  medianPriceLow: number | null; // multi-zip geos: range across zips
  medianPriceHigh: number | null;
  medianDom: number | null; // avg across zips
  inventory: number | null; // sum across zips
  homesSold: number | null; // sum across zips
  yoyPct: number | null; // single-zip only (aggregating a YoY is misleading)
  pulledAt: string; // newest created_at among the rows used: when we stored them
  areaLabel: string | null; // what the numbers cover, where the zip is wider than the geo
  areaNote: string | null;
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
    .select("zip,month,median_price,median_dom,inventory_count,sales_count,yoy_pct,created_at")
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
  const pulledAt = rows
    .map((r) => r.created_at)
    .reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));

  return {
    areaLabel: ZIP_AREA[geo]?.label ?? null,
    areaNote: ZIP_AREA[geo]?.note ?? null,
    // `month` is the window's first month (PERIOD BEGIN), so the window runs
    // through the month two after it.
    periodLabel: windowEnd(latestMonth).toLocaleString("en-US", {
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
    pulledAt,
  };
}

function windowEnd(month: string): Date {
  const d = new Date(month);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 1));
}
