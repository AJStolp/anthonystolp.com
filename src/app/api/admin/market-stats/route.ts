import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  MarketStatInput,
  upsertMarketStats,
} from "@/lib/market-data";
import { fetchRedfinZipStats } from "@/lib/market-data/redfin";
import { getAgentProfile, DEFAULT_AGENT_ID } from "@/lib/agent-profile";

const ManualBodySchema = z.object({
  mode: z.literal("manual"),
  rows: z.array(MarketStatInput).min(1),
});

const RedfinBodySchema = z.object({
  mode: z.literal("redfin"),
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
});

const BodySchema = z.union([ManualBodySchema, RedfinBodySchema]);

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const agent = getAgentProfile(DEFAULT_AGENT_ID);

  if (parsed.data.mode === "manual") {
    const result = await upsertMarketStats(
      parsed.data.rows,
      "manual",
      agent.agentId,
    );
    return NextResponse.json({ result });
  }

  // Redfin
  try {
    const rows = await fetchRedfinZipStats({
      targetZips: agent.targetZips,
      targetMonth: parsed.data.month,
    });
    if (rows.length === 0) {
      return NextResponse.json(
        {
          result: {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [
              `Redfin returned 0 rows for ${parsed.data.month} on agent's target zips. The month may not be published yet or the TSV schema changed.`,
            ],
          },
        },
        { status: 200 },
      );
    }
    const result = await upsertMarketStats(rows, "redfin", agent.agentId);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[admin/market-stats] Redfin fetch failed:", err);
    return NextResponse.json({ error: "Redfin fetch failed" }, { status: 502 });
  }
}
