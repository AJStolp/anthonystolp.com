// Redfin Data Center fetcher — streaming version.
//
// Redfin publishes the zip-level housing market tracker as a plain CSV at:
//   https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_data_center/housing_market/monthly/all_zips.csv
// (linked from https://www.redfin.com/news/data-center/downloads/). The old
// redfin_market_tracker/zip_code_market_tracker.tsv000.gz answers 403.
//
// IMPORTANT: at zip granularity, Redfin only publishes ROLLING 90-DAY
// windows (FREQUENCY "Rolling 3 Months"), not true monthly aggregates. Every
// row is a 3-month rolling snapshot anchored at PERIOD BEGIN. We take the row
// with the most recent PERIOD BEGIN per target zip and treat that as "current
// 3-month rolling stats." Email framing reflects this.
//
// The CSV is about 2 GB nationally, so we stream the response through a line
// reader, filter per-line, and keep at most one row per target zip in memory.
// Memory bounded to (target_zips × 1 row).
//
// Units: the "(%)" columns are percentages (7.64 = 7.64%). market_stats
// stores mom_pct / yoy_pct as decimals (0.0764), so they are divided by 100.
//
// TOS note: Redfin Data Center is free public data. Every email we send
// includes "Data from Redfin Data Center" as attribution per their terms.

import { Readable } from "node:stream";
import readline from "node:readline";
import type { MarketStatInput } from "./index";

const REDFIN_ZIP_TRACKER_URL =
  process.env.REDFIN_ZIP_TRACKER_URL ??
  "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_data_center/housing_market/monthly/all_zips.csv";

const MAX_LINES_SCANNED = 25_000_000;

// The only FREQUENCY the zip file carries today. Anything else is a different
// window length and must not be mixed into the rolling 90-day series.
const ROLLING_90_DAY = "Rolling 3 Months";

// Header names exactly as Redfin spells them. Every one is required: a renamed
// column must fail the import loudly rather than store nulls.
const COLUMNS = {
  frequency: "FREQUENCY",
  periodBegin: "PERIOD BEGIN",
  region: "REGION NAME",
  medianSale: "MEDIAN SALE PRICE NSA ($)",
  momPct: "MEDIAN SALE PRICE NSA MOM (%)",
  yoyPct: "MEDIAN SALE PRICE NSA YOY (%)",
  dom: "MEDIAN DAYS ON MARKET (DAYS)",
  inventory: "INVENTORY",
  homesSold: "HOMES SOLD",
} as const;

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
 * target zip. Throws on network or parse failure.
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
  const rl = readline.createInterface({
    input: nodeStream,
    crlfDelay: Infinity,
  });

  try {
    return await parseZipTrackerLines(rl, opts);
  } finally {
    rl.close();
    nodeStream.destroy();
  }
}

/**
 * Parse Redfin's zip tracker CSV, header line first. Returns the most-recent
 * rolling 90-day row per target zip. Throws when a required column is missing.
 */
export async function parseZipTrackerLines(
  lines: AsyncIterable<string> | Iterable<string>,
  opts: FetchOptions,
): Promise<FetchResult> {
  const targetSet = new Set(opts.targetZips);
  const sinceMonth = opts.sinceMonth;

  // For each target zip, keep the row with the most recent period begin.
  type Candidate = {
    periodBegin: string;
    row: MarketStatInput;
  };
  const bestPerZip = new Map<string, Candidate>();
  const monthsSeenPerZip = new Map<string, Set<string>>();

  let headers: string[] | null = null;
  let idx: Record<keyof typeof COLUMNS, number> | null = null;
  // Columns up to and including these are enough to decide whether a line is
  // wanted, so most of the 5M national lines are never fully split.
  let filterWidth = 0;
  let scanned = 0;

  for await (const line of lines) {
    if (scanned++ > MAX_LINES_SCANNED) {
      throw new Error(`Redfin stream exceeded ${MAX_LINES_SCANNED} lines`);
    }

    if (headers === null || idx === null) {
      headers = splitCsvLine(line).map((h) => h.trim());
      const found = {} as Record<keyof typeof COLUMNS, number>;
      const missing: string[] = [];
      for (const [key, name] of Object.entries(COLUMNS) as [
        keyof typeof COLUMNS,
        string,
      ][]) {
        found[key] = headers.indexOf(name);
        if (found[key] < 0) missing.push(name);
      }
      if (missing.length > 0) {
        throw new Error(
          `Redfin CSV schema unexpected, missing column(s): ${missing.join(", ")}`,
        );
      }
      idx = found;
      filterWidth =
        Math.max(found.region, found.frequency, found.periodBegin) + 1;
      continue;
    }

    const head = splitCsvLine(line, filterWidth);
    const zip = head[idx.region]?.trim();
    if (!zip || !targetSet.has(zip)) continue;
    if (head[idx.frequency] !== ROLLING_90_DAY) continue;

    const periodBegin = head[idx.periodBegin];
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

    const cols = splitCsvLine(line);
    const row: MarketStatInput = {
      zip,
      month: monthStr,
      medianPrice: numOrNull(cols[idx.medianSale]),
      medianDom: intOrNull(cols[idx.dom]),
      inventoryCount: intOrNull(cols[idx.inventory]),
      salesCount: intOrNull(cols[idx.homesSold]),
      momPct: pctOrNull(cols[idx.momPct]),
      yoyPct: pctOrNull(cols[idx.yoyPct]),
      raw: rowAsObject(headers, cols),
    };
    bestPerZip.set(zip, { periodBegin, row });
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

// Quote-aware CSV split. Redfin quotes text fields, and some contain commas
// ("Milwaukee, WI metro area"), so a plain split(",") misaligns every column
// after them. Stops after maxFields fields.
function splitCsvLine(line: string, maxFields = Infinity): string[] {
  const out: string[] = [];
  const n = line.length;
  let i = 0;
  while (out.length < maxFields) {
    if (line[i] === '"') {
      let val = "";
      i++;
      while (i < n) {
        const q = line.indexOf('"', i);
        if (q < 0) {
          val += line.slice(i);
          i = n;
          break;
        }
        val += line.slice(i, q);
        if (line[q + 1] === '"') {
          val += '"';
          i = q + 2;
        } else {
          i = q + 1;
          break;
        }
      }
      out.push(val);
      if (i >= n) break;
      i++; // the comma after the closing quote
    } else {
      const c = line.indexOf(",", i);
      if (c < 0) {
        out.push(line.slice(i));
        break;
      }
      out.push(line.slice(i, c));
      i = c + 1;
    }
  }
  return out;
}

function numOrNull(v: string | undefined): number | null {
  if (!v || v === "" || v === "null") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Redfin "(%)" columns are percentages; market_stats stores decimals.
function pctOrNull(v: string | undefined): number | null {
  const n = numOrNull(v);
  return n == null ? null : n / 100;
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
