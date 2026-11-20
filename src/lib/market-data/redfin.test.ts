import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseZipTrackerLines } from "./redfin";

// Real header and rows from Redfin's all_zips.csv (LAST UPDATED 2026-11-03):
// 07002 (a non-target zip whose METRO contains a comma), then 53012's
// July, August and March windows with 53024's August window between them, so
// the newest 53012 row is neither first nor last.
const FIXTURE = readFileSync(
  new URL("./__fixtures__/redfin-zip-tracker-sample.csv", import.meta.url),
  "utf8",
)
  .trimEnd()
  .split("\n");
const [HEADER, ...DATA] = FIXTURE as [string, ...string[]];

const NEWEST_53012 = DATA.find(
  (l) => l.includes('"53012"') && l.includes('"2026-08-01"'),
)!;

describe("parseZipTrackerLines", () => {
  test("picks 53012's newest rolling 90-day row with every field filled", async () => {
    const { rows } = await parseZipTrackerLines(FIXTURE, {
      targetZips: ["53012"],
    });

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.zip).toBe("53012");
    expect(row.month).toBe("2026-08-01");
    expect(row.medianPrice).toBe(499744);
    expect(row.medianDom).toBe(45);
    expect(row.inventoryCount).toBe(41);
    expect(row.salesCount).toBe(59);
    // Redfin publishes -6.68 (%); market_stats stores the decimal.
    expect(row.yoyPct).toBeCloseTo(-0.0668, 6);
    // Rolling-window rows carry NA for month-over-month.
    expect(row.momPct).toBeNull();
    expect(row.raw?.["PERIOD END"]).toBe("2026-10-31");
  });

  test("throws when a required column is missing", async () => {
    const renamed = HEADER.replace(
      '"MEDIAN SALE PRICE NSA ($)"',
      '"MEDIAN SALE PRICE ($)"',
    );
    expect(renamed).not.toBe(HEADER);

    await expect(
      parseZipTrackerLines([renamed, ...DATA], { targetZips: ["53012"] }),
    ).rejects.toThrow("MEDIAN SALE PRICE NSA ($)");
  });

  test("ignores a row with a different duration, even when it is newer", async () => {
    // Synthetic: the real file only carries "Rolling 3 Months" today.
    const otherDuration = NEWEST_53012.replace(
      '"Rolling 3 Months","2026-08-01","2026-10-31"',
      '"Rolling 1 Month","2026-10-01","2026-10-31"',
    );
    expect(otherDuration).not.toBe(NEWEST_53012);

    const { rows } = await parseZipTrackerLines(
      [HEADER, ...DATA, otherDuration],
      { targetZips: ["53012"] },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.month).toBe("2026-08-01");
    expect(rows[0]!.medianPrice).toBe(499744);
  });

  test("keeps the newest window whichever order the rows arrive in", async () => {
    const reversed = await parseZipTrackerLines(
      [HEADER, ...[...DATA].reverse()],
      { targetZips: ["53012"] },
    );
    const asPublished = await parseZipTrackerLines(FIXTURE, {
      targetZips: ["53012"],
    });

    expect(reversed.rows.map((r) => r.month)).toEqual(["2026-08-01"]);
    expect(asPublished.rows.map((r) => r.month)).toEqual(["2026-08-01"]);
    expect(asPublished.diagnostics.publishedMonthsPerZip["53012"]).toEqual([
      "2026-03-01",
      "2026-07-01",
      "2026-08-01",
    ]);
  });

  test("ignores zips that were not asked for", async () => {
    const only53012 = await parseZipTrackerLines(FIXTURE, {
      targetZips: ["53012"],
    });
    expect(only53012.rows.map((r) => r.zip)).toEqual(["53012"]);

    const both = await parseZipTrackerLines(FIXTURE, {
      targetZips: ["53012", "53024"],
    });
    expect(both.rows.map((r) => r.zip).sort()).toEqual(["53012", "53024"]);
    expect(both.rows.find((r) => r.zip === "53024")!.medianPrice).toBe(
      505741,
    );
  });
});
