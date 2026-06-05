import { z } from "zod";
import { getSupabase } from "../supabase-server";

// Common shape every data source produces. Drives downstream Claude drafting.
export const MarketStatInput = z.object({
  zip: z.string().min(5).max(10),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "YYYY-MM-01 format"),
  medianPrice: z.number().nullable().optional(),
  avgPrice: z.number().nullable().optional(),
  medianDom: z.number().int().nullable().optional(),
  inventoryCount: z.number().int().nullable().optional(),
  salesCount: z.number().int().nullable().optional(),
  momPct: z.number().nullable().optional(),
  yoyPct: z.number().nullable().optional(),
  raw: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type MarketStatInput = z.infer<typeof MarketStatInput>;

export type IngestSource = "redfin" | "mls" | "manual";

export type IngestResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

/**
 * Persist a batch of stats to market_stats. Idempotent on (zip, month):
 * existing rows are updated, new ones inserted.
 */
export async function upsertMarketStats(
  rows: MarketStatInput[],
  source: IngestSource,
  agentId: string | null,
): Promise<IngestResult> {
  const result: IngestResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    result.errors.push(
      err instanceof Error ? err.message : "Supabase not configured",
    );
    return result;
  }

  for (const row of rows) {
    const parsed = MarketStatInput.safeParse(row);
    if (!parsed.success) {
      result.skipped += 1;
      result.errors.push(
        `${row.zip ?? "?"}/${row.month ?? "?"}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
      continue;
    }
    const r = parsed.data;
    const { data: existing } = await supabase
      .from("market_stats")
      .select("id")
      .eq("zip", r.zip)
      .eq("month", r.month)
      .maybeSingle();

    const payload = {
      zip: r.zip,
      month: r.month,
      median_price: r.medianPrice ?? null,
      avg_price: r.avgPrice ?? null,
      median_dom: r.medianDom ?? null,
      inventory_count: r.inventoryCount ?? null,
      sales_count: r.salesCount ?? null,
      mom_pct: r.momPct ?? null,
      yoy_pct: r.yoyPct ?? null,
      raw: r.raw ?? null,
      source,
      agent_id: agentId,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("market_stats")
        .update(payload)
        .eq("id", existing.id);
      if (error) result.errors.push(`${r.zip}/${r.month}: ${error.message}`);
      else result.updated += 1;
    } else {
      const { error } = await supabase.from("market_stats").insert(payload);
      if (error) result.errors.push(`${r.zip}/${r.month}: ${error.message}`);
      else result.inserted += 1;
    }
  }

  return result;
}

export async function getStatsForReport(
  zip: string,
  month: string,
): Promise<{
  current: Record<string, unknown> | null;
  priorMonth: Record<string, unknown> | null;
  priorYear: Record<string, unknown> | null;
}> {
  const supabase = getSupabase();
  const monthDate = new Date(month);
  const priorMonthDate = new Date(monthDate);
  priorMonthDate.setMonth(priorMonthDate.getMonth() - 1);
  const priorYearDate = new Date(monthDate);
  priorYearDate.setFullYear(priorYearDate.getFullYear() - 1);

  const fetch = async (m: Date) => {
    const iso = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("market_stats")
      .select("*")
      .eq("zip", zip)
      .eq("month", iso)
      .maybeSingle();
    return data;
  };

  const [current, priorMonth, priorYear] = await Promise.all([
    fetch(monthDate),
    fetch(priorMonthDate),
    fetch(priorYearDate),
  ]);
  return { current, priorMonth, priorYear };
}
