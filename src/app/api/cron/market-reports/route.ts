import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { DEFAULT_AGENT_ID, getAgentProfile } from "@/lib/agent-profile";
import { fetchRedfinZipStatsWithDiagnostics } from "@/lib/market-data/redfin";
import { upsertMarketStats } from "@/lib/market-data";
import {
  REPORT_MODEL,
  draftReport,
  factCheckDraft,
  validateDraft,
  zipHasSubscribers,
} from "@/lib/market-report";
import { Resend as ResendClient } from "resend";

// Allow up to 5 minutes for the cron: Redfin stream plus Claude calls.
// Hobby plan caps at 60s; pro/enterprise can go higher.
export const maxDuration = 300;

// Monthly cron entry. Triggered by Vercel Cron (see vercel.json).
//
// Drafts one River Report section per zip and sends nothing to subscribers.
// AJ reviews and approves the sections in /admin/reports, and the River Report
// issue send places the approved section for each subscriber's zip. The only
// email sent here is the summary to AJ.
//
// Verified via CRON_SECRET header to prevent random invocations.

const ZIP_LABELS: Record<string, string> = {
  "53012": "Cedarburg (53012)",
  "53092": "Mequon / Thiensville (53092)",
  "53097": "Mequon (53097)",
  "53024": "Grafton (53024)",
  "53074": "Port Washington (53074)",
  "53080": "Saukville (53080)",
  "53090": "West Bend (53090)",
  "53095": "West Bend (53095)",
  "53027": "Hartford (53027)",
  "53022": "Germantown (53022)",
  "53037": "Jackson (53037)",
  "53086": "Slinger (53086)",
};

export async function GET(req: Request) {
  // Verify the cron secret. Vercel cron sends this header automatically once
  // CRON_SECRET is set in project env vars.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const agent = getAgentProfile(DEFAULT_AGENT_ID);
  const supabase = getSupabase();

  // Run on the 1st of each month. The target "month" is just the bookkeeping
  // anchor for the market_reports row — Redfin gives us a rolling 90-day
  // window per zip, so the report itself describes that 3-month window.
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const month = target.toISOString().slice(0, 10);
  // Floor: ignore rows older than 6 months so a long-stale zip doesn't get
  // shipped as "current."
  const sinceDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1),
  );
  const sinceMonth = sinceDate.toISOString().slice(0, 10);

  const summary: {
    month: string;
    ingest: unknown;
    reports: Array<{
      zip: string;
      status: string;
      score?: number;
      error?: string;
    }>;
  } = { month, ingest: null, reports: [] };

  // ── Step 1: Ingest stats for this month from Redfin (streaming) ────────
  // The Redfin national zip-tracker is multi-GB; the fetcher streams it and
  // aborts early once every target zip is found for the target month.
  // REDFIN_DISABLED=true env flag lets us bypass for break-glass scenarios.
  if (process.env.REDFIN_DISABLED === "true") {
    summary.ingest = { skipped: "REDFIN_DISABLED=true" };
  } else {
    try {
      const fetched = await fetchRedfinZipStatsWithDiagnostics({
        targetZips: agent.targetZips,
        sinceMonth,
      });
      if (fetched.rows.length > 0) {
        const upsert = await upsertMarketStats(
          fetched.rows,
          "redfin",
          agent.agentId,
        );
        summary.ingest = { ...upsert, diagnostics: fetched.diagnostics };
      } else {
        summary.ingest = {
          warning: `Redfin returned 0 rows for ${month}. Data may not be published yet for this month.`,
          diagnostics: fetched.diagnostics,
        };
      }
    } catch (err) {
      summary.ingest = {
        error: err instanceof Error ? err.message : "Redfin fetch failed",
      };
    }
  }

  // ── Step 2: For each zip with stats AND subscribers, draft + self-review ─
  for (const zip of agent.targetZips) {
    try {
      if (!(await zipHasSubscribers(supabase, zip))) {
        summary.reports.push({ zip, status: "skipped-no-subscribers" });
        continue;
      }

      // Pull the most recent stats we have for this zip (Redfin's 90-day rolling).
      const { data: latest } = await supabase
        .from("market_stats")
        .select("*")
        .eq("zip", zip)
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) {
        summary.reports.push({ zip, status: "skipped-no-stats" });
        continue;
      }

      // Skip if a report already exists for this zip+month
      const { data: existing } = await supabase
        .from("market_reports")
        .select("id,status")
        .eq("zip", zip)
        .eq("month", month)
        .maybeSingle();
      if (existing) {
        summary.reports.push({
          zip,
          status: `exists-${existing.status}`,
        });
        continue;
      }

      // Pull the prior rolling window for trend context if we have it.
      const { data: prior } = await supabase
        .from("market_stats")
        .select("*")
        .eq("zip", zip)
        .lt("month", latest.month)
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      const draft = await draftReport({
        agent,
        zip,
        zipLabel: ZIP_LABELS[zip] ?? zip,
        month,
        current: latest,
        priorMonth: prior,
        priorYear: null,
      });
      if (!draft) {
        summary.reports.push({ zip, status: "draft-failed" });
        continue;
      }

      // Two-pass safety: deterministic validation, then Claude fact-check
      // against the source stats. Both must pass to be ready for approval.
      const validation = validateDraft(draft);
      const factCheck = await factCheckDraft(draft, latest, agent);
      const factOk = factCheck?.accurate ?? false;
      const score = factCheck?.confidence ?? 0;

      const notesParts: string[] = [];
      if (!validation.valid) {
        notesParts.push("VALIDATION ISSUES:");
        for (const issue of validation.issues) notesParts.push(`- ${issue}`);
      }
      if (factCheck) {
        notesParts.push("");
        notesParts.push(`FACT-CHECK: ${factCheck.summary}`);
        const mismatches = factCheck.claims.filter((c) => !c.matches);
        if (mismatches.length > 0) {
          notesParts.push("Mismatches:");
          for (const m of mismatches) {
            notesParts.push(
              `- "${m.text}" vs ${m.source_field ?? "?"}=${m.source_value ?? "?"}${m.note ? ` (${m.note})` : ""}`,
            );
          }
        }
      } else {
        notesParts.push("FACT-CHECK: not run (API key missing or error)");
      }

      // Passed → 'ready' (approved). Failed → 'draft' for AJ to fix and approve.
      const passed = validation.valid && factOk;
      const initialStatus = passed ? "ready" : "draft";

      const { data: inserted, error: insertErr } = await supabase
        .from("market_reports")
        .insert({
          zip,
          month,
          subject: draft.subject,
          body_text: draft.bodyText,
          body_html: draft.bodyHtml,
          model: REPORT_MODEL,
          draft_score: score,
          review_notes: notesParts.join("\n"),
          status: initialStatus,
          agent_id: agent.agentId,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        summary.reports.push({
          zip,
          status: "insert-failed",
          error: insertErr?.message,
        });
        continue;
      }

      summary.reports.push({ zip, status: initialStatus, score });
    } catch (err) {
      summary.reports.push({
        zip,
        status: "error",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // ── Step 3: Notify the agent ──────────────────────────────────────────
  // A single summary email so AJ knows what happened and has a paper trail.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && summary.reports.length > 0) {
    const resend = new ResendClient(apiKey);
    const lines = summary.reports
      .map(
        (r) =>
          `- ${r.zip}: ${r.status}${r.score != null ? ` (score ${r.score})` : ""}${r.error ? `: ${r.error}` : ""}`,
      )
      .join("\n");
    const note =
      "These are River Report zip sections, not emails. Nothing was sent to subscribers. Sections that passed both checks are marked 'ready', which counts as approved. Sections marked 'draft' need a read and an Approve in /admin/reports. Approved sections go out inside The River Report.";
    await resend.emails
      .send({
        from: `Anthony Stolp Site <${agent.fromEmail}>`,
        to: agent.replyToEmail,
        subject: `River Report zip sections, ${month}`,
        text: `Month: ${month}\n\n${note}\n\nResults:\n${lines}\n\nReview: https://${agent.websiteDomain}/admin/reports`,
      })
      .catch((err) => {
        console.error("[cron/market-reports] notify email failed:", err);
      });
  }

  return NextResponse.json(summary);
}
