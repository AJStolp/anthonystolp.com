// Redfin Data Center fetcher — streaming version.
//
// Redfin publishes free zip-level market trackers as gzipped TSV at:
//   https://redfin-public-data.s3-us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz
//
// IMPORTANT: at zip granularity, Redfin only publishes ROLLING 90-DAY
// windows (period_duration=90), not true monthly aggregates. Every row is a
// 3-month rolling snapshot anchored at period_begin. We take the row with
// the most recent period_begin per target zip and treat that as "current
// 3-month rolling stats." Email framing reflects this.
//
// The gunzipped TSV is multi-GB nationally, so we stream the response
// through gunzip + line reader, filter per-line, and keep at most one row
// per target zip in memory. Memory bounded to (target_zips × 1 row).
//
// TOS note: Redfin Data Center is free public data. Every email we send
// includes "Data from Redfin Data Center" as attribution per their terms.

import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import readline from "node:readline";
import type { MarketStatInput } from "./index";

const REDFIN_ZIP_TRACKER_URL =
  process.env.REDFIN_ZIP_TRACKER_URL ??
  "https://redfin-public-data.s3-us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz";

const MAX_LINES_SCANNED = 25_000_000;

export type FetchOptions = {
  targetZips: string[];      // only return rows for these zips
  // targetMonth is no longer a hard filter — we return most-recent rolling
  // window per zip. Kept on the type for back-compat with callers that pass it.
  targetMonth?: string;
  sinceMonth?: string;       // optional floor: ignore rows older than this YYYY-MM-01
};

export type FetchResult = {
  rows: MarketStatInput[];
  diagnostics: {
    linesScanned: number;
    publishedMonthsPerZip: Record<string, string[]>;
  };
};

/**
 * Stream Redfin zip tracker, return the most-recent rolling-90 row per
 * target zip. Throws on network/decompression/parse failure.
 */
export async function fetchRedfinZipStats(
  opts: FetchOptions,
): Promise<MarketStatInput[]> {
  const result = await fetchRedfinZipStatsWithDiagnostics(opts);
  return result.rows;
}

export async function fetchRedfinZipStatsWithDiagnostics(
  opts: FetchOptions,
): Promise<FetchResult> {
  if (opts.targetZips.length === 0) {
    return {
      rows: [],
      diagnostics: { linesScanned: 0, publishedMonthsPerZip: {} },
    };
  }

  const res = await fetch(REDFIN_ZIP_TRACKER_URL, {
    headers: {
      "User-Agent": "anthonystolp.com market-report aggregator",
    },
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    throw new Error(
      `Redfin fetch failed: ${res.status} ${res.statusText || "no body"}`,
    );
  }

  const nodeStream = Readable.fromWeb(
    res.body as unknown as Parameters<typeof Readable.fromWeb>[0],
  );
  const gunzip = createGunzip();
  nodeStream.on("error", (e) => gunzip.destroy(e));
  nodeStream.pipe(gunzip);

  const rl = readline.createInterface({
    input: gunzip,
    crlfDelay: Infinity,
  });

  const targetSet = new Set(opts.targetZips);

  // For each target zip, keep the row with the most recent period_begin.
  type Candidate = {
    periodBegin: string;
    row: MarketStatInput;
  };
  const bestPerZip = new Map<string, Candidate>();
  const monthsSeenPerZip = new Map<string, Set<string>>();

  let headers: string[] | null = null;
  let i_region = -1;
  let i_periodBegin = -1;
  let i_periodDuration = -1;
  let i_medianSale = -1;
  let i_homesSold = -1;
  let i_inventory = -1;
  let i_dom = -1;
  let i_momPct = -1;
  let i_yoyPct = -1;
  let scanned = 0;

  const sinceMonth = opts.sinceMonth;

  try {
    for await (const line of rl) {
      if (scanned++ > MAX_LINES_SCANNED) {
        throw new Error(
          `Redfin stream exceeded ${MAX_LINES_SCANNED} lines`,
        );
      }

      if (headers === null) {
        headers = line.split("\t").map((h) =>
          h.trim().replace(/^"|"$/g, "").toLowerCase(),
        );
        i_region = headers.indexOf("region");
        i_periodBegin = headers.indexOf("period_begin");
        i_periodDuration = headers.indexOf("period_duration");
        i_medianSale = headers.indexOf("median_sale_price");
        i_homesSold = headers.indexOf("homes_sold");
        i_inventory = headers.indexOf("inventory");
        i_dom = headers.indexOf("median_dom");
        i_momPct = headers.indexOf("median_sale_price_mom");
        i_yoyPct = headers.indexOf("median_sale_price_yoy");
        if (i_region < 0 || i_periodBegin < 0) {
          throw new Error(
            `Redfin TSV schema unexpected — missing 'region' or 'period_begin' (headers: ${headers.slice(0, 8).join(", ")}…)`,
          );
        }
        continue;
      }

      const cols = line
        .split("\t")
        .map((c) => c.replace(/^"|"$/g, ""));
      const region = cols[i_region];
      if (!region) continue;
      const zipMatch = region.match(/(\d{5})/);
      if (!zipMatch) continue;
      const zip = zipMatch[1]!;
      if (!targetSet.has(zip)) continue;

      const periodBegin = cols[i_periodBegin];
      if (!periodBegin) continue;
      const monthStr = `${periodBegin.slice(0, 7)}-01`;

      // Track every month we see for diagnostics.
      let seen = monthsSeenPerZip.get(zip);
      if (!seen) {
        seen = new Set<string>();
        monthsSeenPerZip.set(zip, seen);
      }
      seen.add(monthStr);

      if (sinceMonth && monthStr < sinceMonth) continue;

      const existing = bestPerZip.get(zip);
      if (existing && existing.periodBegin >= periodBegin) continue;

      const row: MarketStatInput = {
        zip,
        month: monthStr,
        medianPrice: numOrNull(cols[i_medianSale]),
        medianDom: intOrNull(cols[i_dom]),
        inventoryCount: intOrNull(cols[i_inventory]),
        salesCount: intOrNull(cols[i_homesSold]),
        momPct: numOrNull(cols[i_momPct]),
        yoyPct: numOrNull(cols[i_yoyPct]),
        raw: rowAsObject(headers!, cols),
      };
      bestPerZip.set(zip, { periodBegin, row });
    }
  } finally {
    rl.close();
    nodeStream.destroy();
  }

  const rows = Array.from(bestPerZip.values()).map((c) => c.row);
  const publishedMonthsPerZip: Record<string, string[]> = {};
  for (const [zip, set] of monthsSeenPerZip.entries()) {
    publishedMonthsPerZip[zip] = Array.from(set).sort();
  }

  return {
    rows,
    diagnostics: { linesScanned: scanned, publishedMonthsPerZip },
  };
}

function numOrNull(v: string | undefined): number | null {
  if (!v || v === "" || v === "null") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v: string | undefined): number | null {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
}

function rowAsObject(
  headers: string[],
  cols: string[],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]!] = cols[i] ?? null;
  }
  return obj;
}
