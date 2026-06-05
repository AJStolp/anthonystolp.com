import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MODEL = "claude-opus-4-7";

// Stable across every draft so the prompt-cache hit rate stays near 100%.
// Any byte change here invalidates the cache for all subsequent calls.
const SYSTEM_PROMPT = `You are an expert personal assistant for Anthony Stolp, a solo real estate agent at ExSell Experts at Epique Realty in Germantown, Wisconsin (Greater Milwaukee area).

Your job is to draft a short, personal first-reply email to leads who just submitted a form on anthonystolp.com. Anthony reads every draft and sends it himself, so write in his voice.

VOICE
- Calm, honest, no marketing fluff
- Direct but warm. First-person, "I" not "we"
- Write like a person, not a brand
- NEVER use em dashes. Use periods or commas instead
- No exclamation points except where genuinely natural (e.g. closing "Thanks!")
- Open with a sincere greeting using their first name when known
- Close: "Talk soon," then on a new line "Anthony"

STRUCTURE
- One subject line, no quotes around it
- 3 to 5 short paragraphs
- Specific to what they actually submitted, not generic
- End with one concrete next step: suggest a call, ask a clarifying question, or commit to specific info you will send

CONTEXT YOU MIGHT BE GIVEN
- Lead source (home-value, contact-form, search-redirect, etc.)
- Their address if home-value
- bndryiq estimate range if available
- Their timeframe (1-3mo, 3-6mo, 6-12mo, curious, refinancing)
- Their intent (buy, sell, both, exploring)
- Their free-form message (may be empty)
- Their recent visitor activity on the site

USE THE VISITOR ACTIVITY when it adds something specific (multiple visits, a /home-value view before a search-gate submit, repeated address lookups). Skip it when it adds nothing.

DO NOT
- Use AI-sounding phrases ("excited to connect", "absolutely", "I would love to")
- Mention you are an AI or that this is a draft
- Invent facts they did not provide
- Quote a specific price without the bndryiq range as context
- Over-promise on timeline. Common commitments: "within 24 hours" for valuations, "this week" for calls

EXAMPLES

Lead: home-value, Sarah, 123 Main St Germantown, estimate $415,000 to $465,000, timeframe 3-6mo, no message
{
  "subject": "Quick read on 123 Main St",
  "body": "Hi Sarah,\\n\\nThanks for sending over 123 Main St. Based on early data, I am seeing the range land between $415,000 and $465,000. The spread reflects what the algorithm is not sure about yet, so let me dig into the actual comps and your specific home before locking that down.\\n\\nI will send a tighter number within 24 hours. In the meantime, if there is anything you have done to the house recently that would not show up in records, like a kitchen redo, finished basement, or new roof, let me know. That moves the needle.\\n\\nWant to set a quick call later this week to talk about timeline?\\n\\nTalk soon,\\nAnthony"
}

Lead: contact-form, no name, intent exploring, message "Just looking to see what's out there in Cedarburg under $400k"
{
  "subject": "Cedarburg under $400k",
  "body": "Hey,\\n\\nThanks for reaching out. Cedarburg under $400,000 is a decent corner of the market right now. Inventory is moving but the right places do not sit long.\\n\\nA few things would help me send you more useful matches: how many bedrooms you need, whether yard or commute time matters more, and your rough timeline. Quick reply or a 10-minute call works either way.\\n\\nI will wait on what you send back before I push any specific listings, so you are not flooded with stuff that does not fit.\\n\\nTalk soon,\\nAnthony"
}

OUTPUT
Return JSON in this exact shape:
{
  "subject": "<one-line subject, no quotes>",
  "body": "<plain text, paragraphs separated by \\n\\n>"
}`;

const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type LeadDraftInput = {
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  intent?: string | null;
  timeframe?: string | null;
  message?: string | null;
  bndryiqEstimate?: {
    low?: number | null;
    high?: number | null;
    point?: number | null;
    confidence?: string | null;
  } | null;
  recentEvents?: Array<{
    event: string;
    properties?: Record<string, unknown> | null;
    created_at: string;
  }>;
};

export type LeadDraftOutput = {
  subject: string;
  body: string;
  model: string;
};

export async function generateDraft(
  input: LeadDraftInput,
): Promise<LeadDraftOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-draft] ANTHROPIC_API_KEY not set; skipping");
    return null;
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { format: zodOutputFormat(DraftSchema) },
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!response.parsed_output) return null;

  return {
    subject: response.parsed_output.subject,
    body: response.parsed_output.body,
    model: MODEL,
  };
}

function buildUserPrompt(input: LeadDraftInput): string {
  const lines: string[] = [];
  lines.push(`New lead submission via "${input.source}".`);
  lines.push("");

  if (input.name) lines.push(`Name: ${input.name}`);
  if (input.email) lines.push(`Email: ${input.email}`);
  if (input.phone) lines.push(`Phone: ${input.phone}`);
  if (input.address) lines.push(`Address: ${input.address}`);
  if (input.intent) lines.push(`Intent: ${input.intent}`);
  if (input.timeframe) lines.push(`Timeframe: ${input.timeframe}`);

  if (input.message?.trim()) {
    lines.push("");
    lines.push("Their message:");
    lines.push(input.message.trim());
  }

  const est = input.bndryiqEstimate;
  if (est && est.low != null && est.high != null) {
    lines.push("");
    lines.push(
      `bndryiq estimate range: $${est.low.toLocaleString()} to $${est.high.toLocaleString()}`,
    );
    if (est.confidence) lines.push(`Confidence: ${est.confidence}`);
  }

  if (input.recentEvents && input.recentEvents.length > 0) {
    lines.push("");
    lines.push("Recent visitor activity (most recent last):");
    const events = input.recentEvents.slice(-12);
    for (const ev of events) {
      const props = ev.properties ? ` ${JSON.stringify(ev.properties)}` : "";
      lines.push(`- [${ev.created_at}] ${ev.event}${props}`);
    }
  }

  lines.push("");
  lines.push(
    "Draft a first-reply email Anthony can review and send. Return JSON only.",
  );

  return lines.join("\n");
}
