// Claude-drafted monthly market report for a single zip + safety checks.
//
// Pipeline:
//   1. draftReport()       — Claude writes the email
//   2. validateDraft()     — deterministic checks (em dashes, attribution,
//                            sign-off, length) — free, instant, no LLM
//   3. factCheckDraft()    — Claude verifies every numerical claim matches
//                            the underlying market_stats row
//   4. Both passes → status=ready (or auto-send via env flag)
//      Any failure → status=draft with specific notes

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AgentProfile } from "./agent-profile";

const MODEL = "claude-opus-4-7";

const DraftSchema = z.object({
  subject: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string(),
});
export type Draft = z.infer<typeof DraftSchema>;

const FactCheckSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string(),
      source_field: z.string().nullable(),
      source_value: z.string().nullable(),
      matches: z.boolean(),
      note: z.string().nullable(),
    }),
  ),
  accurate: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  summary: z.string(),
});
export type FactCheck = z.infer<typeof FactCheckSchema>;

export type ValidationResult = {
  valid: boolean;
  issues: string[];
};

export type DraftInput = {
  agent: AgentProfile;
  zip: string;
  zipLabel: string;
  month: string;
  current: Record<string, unknown> | null;
  priorMonth: Record<string, unknown> | null;
  priorYear: Record<string, unknown> | null;
};

function buildSystemPrompt(agent: AgentProfile): string {
  return `You are the personal email drafter for ${agent.name}, a solo real estate agent at ${agent.brokerage} serving ${agent.serviceArea}.

Your job is to draft a SHORT market report email for one zip code, based on a rolling 90-day window of stats. The email is delivered monthly to subscribers who explicitly asked to hear about that zip's market. Write in ${agent.shortName}'s voice.

VOICE
${agent.voiceNotes}

STRUCTURE
- Subject line (one line, no quotes around it)
- Greeting using the subscriber's first name placeholder: "Hi {{first_name}}," (use the exact token {{first_name}})
- Open with a one-sentence read on the period
- 2-3 short paragraphs with the actual numbers, each grounded in the stat data you are given
- One concrete take or interpretation (what does this mean for someone in that zip)
- Close: a single line offering a personal conversation ("Reply if you want me to dig into your specific block.")
- Sign off: "Talk soon," then "${agent.shortName}" on the next line

KEEP IT TIGHT
- 2-3 body paragraphs MAX. Not 4-5. Subscribers skim.
- One stat per sentence is fine, not three.

ATTRIBUTION
Always include a small line at the very bottom: "Data from Redfin Data Center. Past performance does not predict future results." Required in both bodyText and bodyHtml.

NUMBERS
- Format prices with commas and dollar signs ($425,000 not 425000)
- Round percentages to one decimal ("4.2% above last year")
- mom_pct and yoy_pct are decimals (0.159 = 15.9%) — multiply by 100 when writing them out
- If a stat is null/missing, do not invent — say so or skip
- Compare current to prior windows when both are present
- Never quote a single-window change without context

DO NOT
- Use AI-sounding phrases
- Use em dashes (use periods or commas)
- Predict future prices
- Use exclamation points
- Mention you are an AI

OUTPUT
Return JSON with subject, bodyText, bodyHtml. bodyHtml uses only <p> and <strong>, no inline styles.`;
}

function buildUserPrompt(input: DraftInput): string {
  const monthName = new Date(input.month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const fmt = (o: Record<string, unknown> | null) =>
    o == null ? "(no data)" : JSON.stringify(o, null, 2);

  return [
    `Zip: ${input.zip} (${input.zipLabel})`,
    `Reporting window anchor: ${monthName}`,
    "Note: this is a 90-day rolling window from Redfin. Frame the email around the period, not a specific calendar month.",
    "",
    "CURRENT WINDOW STATS:",
    fmt(input.current),
    "",
    "PRIOR WINDOW (for trend context):",
    fmt(input.priorMonth),
    "",
    `Draft the report for ${input.zipLabel}. Return JSON only.`,
  ].join("\n");
}

export async function draftReport(input: DraftInput): Promise<Draft | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[market-report] ANTHROPIC_API_KEY not set");
    return null;
  }
  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(input.agent);
  const user = buildUserPrompt(input);

  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    output_config: { format: zodOutputFormat(DraftSchema) },
    messages: [{ role: "user", content: user }],
  });
  return res.parsed_output ?? null;
}

/**
 * Deterministic checks. Free, instant, no LLM. Catches the things we know we
 * never want to see in a sent email — em dashes, missing attribution, missing
 * sign-off, missing {{first_name}} token, wildly off length.
 */
export function validateDraft(
  draft: Draft,
  agent: AgentProfile,
): ValidationResult {
  const issues: string[] = [];

  // No em dashes anywhere
  if (/—/.test(draft.bodyText) || /—/.test(draft.bodyHtml) || /—/.test(draft.subject)) {
    issues.push("Contains em dash (use period or comma)");
  }

  // Attribution line in both bodies
  if (!/data from redfin/i.test(draft.bodyText)) {
    issues.push("Missing 'Data from Redfin Data Center' attribution in bodyText");
  }
  if (!/data from redfin/i.test(draft.bodyHtml)) {
    issues.push("Missing 'Data from Redfin Data Center' attribution in bodyHtml");
  }

  // Sign-off
  const signoff = `Talk soon,\n${agent.shortName}`;
  if (!draft.bodyText.includes(signoff)) {
    issues.push(`Missing exact sign-off "Talk soon,\\n${agent.shortName}" in bodyText`);
  }

  // First-name token
  if (!draft.bodyText.includes("{{first_name}}")) {
    issues.push("Missing {{first_name}} token in greeting");
  }

  // Subject sanity
  if (!draft.subject.trim() || draft.subject.length > 120) {
    issues.push(`Subject length problem (${draft.subject.length} chars)`);
  }
  if (/^["'].*["']$/.test(draft.subject.trim())) {
    issues.push("Subject is wrapped in quotes");
  }

  // Length sanity — 2-7 paragraphs (greeting + body + signoff + attribution)
  const paragraphs = draft.bodyText.split(/\n\n+/).filter((p) => p.trim());
  if (paragraphs.length < 3) {
    issues.push(`Body too short (${paragraphs.length} paragraphs)`);
  }
  if (paragraphs.length > 9) {
    issues.push(`Body too long (${paragraphs.length} paragraphs)`);
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Verify every numerical claim in the draft against the source stats row.
 * Returns structured findings so the admin queue can show exactly which
 * claim mismatched and why.
 */
export async function factCheckDraft(
  draft: Draft,
  sourceStats: Record<string, unknown>,
  agent: AgentProfile,
): Promise<FactCheck | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });

  const system = `You are a fact-checker. You receive a market report email DRAFT and the SOURCE stats JSON it was written from. Your job is to verify every numerical claim in the draft against the source.

PROCESS
1. Read the draft. List every numerical claim you find. A claim is any number that asserts something about the market: a price, a percent, a count, a duration, a ratio.
2. For each claim, identify the source field in the SOURCE JSON that backs it (or null if you cannot find one).
3. Decide whether the claim matches the source within reasonable tolerance.

TOLERANCE
- Dollar amounts: claim must match source within 1% AND round-trip to the same display ($570,000 matches median_price=570000; "$570K" matches; "around $570,000" matches)
- Percentages: claim must match source within 0.1 percentage points. Source values like mom_pct=0.159 mean 15.9%. So "15.9%" matches; "16%" matches if source is 15.9-16.4 range.
- Counts (inventory, sales): must be exact
- Days on market: must be exact
- Pending sales / new listings: must be exact

FLAGGING
- If the draft includes a number you cannot find in the source → matches=false, note explains
- If the draft cites a derived number (e.g. "1.027 sale-to-list ratio") that matches a source field directly → fine
- If the draft cites a number that looks invented or rounded beyond tolerance → matches=false

OUTPUT
Return JSON with:
- claims: array of { text (the literal claim from the draft), source_field (the JSON key it maps to or null), source_value (string rep of source value or null), matches (bool), note (one-line explanation when matches=false, or null) }
- accurate: true if every claim matches, false otherwise
- confidence: 0-100 — your overall confidence in this fact-check (lower if the draft has many claims, or if some claims were ambiguous)
- summary: 1-2 sentences. If accurate, say so. If not, list the worst offenders.`;

  const user = [
    "SOURCE STATS:",
    JSON.stringify(sourceStats, null, 2),
    "",
    "DRAFT SUBJECT:",
    draft.subject,
    "",
    "DRAFT BODY:",
    draft.bodyText,
    "",
    "Return JSON only.",
  ].join("\n");

  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    output_config: { format: zodOutputFormat(FactCheckSchema) },
    messages: [{ role: "user", content: user }],
  });
  return res.parsed_output ?? null;
}

export const REPORT_MODEL = MODEL;
