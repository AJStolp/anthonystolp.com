import { after, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { generateDraft, type LeadDraftInput } from "@/lib/ai-draft";
import { runLeadDefenses } from "@/lib/bot-defense";
import { getSupabase } from "@/lib/supabase-server";
import { resolveToken, type LinkTokenContext } from "@/lib/link-tokens";
import { escapeHtml } from "@/lib/utils";

// ── Validation ─────────────────────────────────────────────────────────────
//
// The schema is intentionally permissive: each funnel enforces its own UX
// requirements client-side. The server only insists on what's needed to
// produce a useful row + email. Backward-compatible with the original
// LeadForm payload (name/email/intent/termsConsent).

const utmSchema = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
  })
  .optional();

const schema = z.object({
  // Pass leadId to update an existing row (used by /home-value step 2).
  leadId: z.string().uuid().optional(),

  // Funnel attribution
  source: z.string().default("contact-form"),
  funnelStep: z.enum(["address-only", "completed"]).default("completed"),

  // Address (optional — only funnels that ask for one populate these)
  address: z.string().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(100).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  mapboxId: z.string().max(128).optional(),

  // Contact (optional for partial captures)
  name: z.string().max(120).optional(),
  email: z.string().email("Valid email required").optional(),
  phone: z.string().max(32).optional(),

  // Intent signals
  intent: z.enum(["buy", "sell", "both", "exploring"]).optional(),
  timeframe: z
    .enum(["1-3mo", "3-6mo", "6-12mo", "curious", "refinancing"])
    .optional(),
  message: z.string().max(4000).optional(),

  // Cross-domain visitor + persisted estimate (from bndryiq iframe).
  visitorId: z.string().max(128).optional(),
  bndryiqEstimate: z
    .object({
      low: z.number().optional(),
      high: z.number().optional(),
      point: z.number().optional(),
      confidence: z.enum(["high", "medium", "low"]).optional(),
      compsUsed: z.number().optional(),
      propertyClass: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  // Consent
  smsConsent: z.boolean().optional(),
  termsConsent: z.boolean().optional(),

  // Attribution / context
  utm: utmSchema,
  referrer: z.string().max(2048).optional(),
  landingPage: z.string().max(2048).optional(),
});

type LeadInput = z.infer<typeof schema>;

// ── Config ─────────────────────────────────────────────────────────────────

const FROM_EMAIL = process.env.LEAD_FROM_EMAIL ?? "hello@anthonystolp.com";
const TO_EMAIL = process.env.LEAD_TO_EMAIL ?? "anthony@exsellexperts.com";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const intentLabel: Record<string, string> = {
  buy: "Buy a home",
  sell: "Sell my home",
  both: "Buy and sell",
  exploring: "Just exploring",
};

const timeframeLabel: Record<string, string> = {
  "1-3mo": "1-3 months",
  "3-6mo": "3-6 months",
  "6-12mo": "6-12 months",
  curious: "Just curious",
  refinancing: "Refinancing",
};

const sourceLabel: Record<string, string> = {
  "contact-form": "Contact form",
  "home-value": "Home value request",
  "search-redirect": "Search redirect (active listings)",
  "market-report-subscribe": "Market report subscriber",
};

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Bot defense: origin check, honeypot, per-IP rate limit. Honeypot trips
  // return a silent 200 so attackers don't learn the trap exists.
  const defense = await runLeadDefenses(req, body as Record<string, unknown>);
  if (defense) {
    return NextResponse.json(defense.body, { status: defense.status });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid form data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const lead = parsed.data;

  // ── 1. Persist to Supabase (insert new row or update existing one) ──
  //
  // Insert/update failures are logged but do NOT block the email send.
  // We treat email delivery as the durable backup channel.

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;

  // Resolve offline-touchpoint attribution (postcard QR, ad, business card, …)
  // from the anthonystolp_token cookie minted by /n/[token].
  let linkToken: PersistedLinkToken | undefined;
  const tokenCookie = readCookie(req, "anthonystolp_token");
  if (tokenCookie) {
    const row = await resolveToken(tokenCookie);
    if (row) {
      linkToken = { token: tokenCookie, context: row.context };
    }
  }

  const leadId = await persistLead(lead, { userAgent, ip, linkToken });

  // Backfill: link prior anonymous tracking_events to this lead so the inbox
  // can show the visitor's full activity history. Best-effort, non-blocking.
  if (leadId && lead.visitorId) {
    backfillTrackingEvents(leadId, lead.visitorId).catch((err) => {
      console.error("[lead] tracking backfill failed:", err);
    });
  }

  // Close the farm outreach loop: if this lead arrived via a farm-postcard
  // token, mark the originating outreach + target as responded.
  if (leadId && linkToken?.context?.kind === "farm") {
    const targetId = linkToken.context.farm_target_id;
    if (typeof targetId === "string" && targetId) {
      closeFarmOutreachLoop(leadId, targetId).catch((err) => {
        console.error("[lead] farm loop close failed:", err);
      });
    }
  }

  // ── 2. Send email notification (only on completed funnel step) ──

  if (lead.funnelStep === "completed") {
    const emailError = await sendNotificationEmail(lead);
    if (emailError) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 502 },
      );
    }

    // Auto-reply to the lead for funnels where it makes sense.
    if (lead.source === "home-value" && lead.email) {
      await sendHomeValueAutoReply(lead).catch((err) => {
        console.error("[lead] auto-reply failed (non-blocking):", err);
      });
    }

    // n8n webhook (best-effort) — AJ owns downstream workflows there.
    if (N8N_WEBHOOK_URL) {
      fireN8nWebhook(lead, leadId).catch((err) => {
        console.error("[lead] n8n webhook failed:", err);
      });
    }

    // AI draft generation runs after the response returns so the user doesn't
    // wait on Claude. Failures here must never block the lead-save path.
    if (leadId) {
      after(async () => {
        try {
          await generateAndStoreDraft(leadId, lead);
        } catch (err) {
          console.error("[lead] ai-draft generation failed:", err);
        }
      });
    }
  }

  return NextResponse.json({ ok: true, leadId });
}

// ── Persistence ────────────────────────────────────────────────────────────

type PersistedLinkToken = { token: string; context: LinkTokenContext | null };

async function persistLead(
  lead: LeadInput,
  ctx: { userAgent?: string; ip?: string; linkToken?: PersistedLinkToken },
): Promise<string | null> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    // Supabase not configured — log and continue. The email channel still works.
    console.error("[lead] Supabase not configured, skipping persistence:", err);
    return null;
  }

  const row = {
    agent_id: process.env.DEFAULT_AGENT_ID ?? null,
    source: lead.source,
    funnel_step: lead.funnelStep,
    address: lead.address ?? null,
    address_line1: lead.addressLine1 ?? null,
    city: lead.city ?? null,
    state: lead.state ?? null,
    postal_code: lead.postalCode ?? null,
    lat: lead.lat ?? null,
    lng: lead.lng ?? null,
    mapbox_id: lead.mapboxId ?? null,
    name: lead.name ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    intent: lead.intent ?? null,
    timeframe: lead.timeframe ?? null,
    message: lead.message ?? null,
    sms_consent: lead.smsConsent ?? false,
    terms_consent: lead.termsConsent ?? false,
    utm_source: lead.utm?.source ?? null,
    utm_medium: lead.utm?.medium ?? null,
    utm_campaign: lead.utm?.campaign ?? null,
    utm_term: lead.utm?.term ?? null,
    utm_content: lead.utm?.content ?? null,
    referrer: lead.referrer ?? null,
    landing_page: lead.landingPage ?? null,
    user_agent: ctx.userAgent ?? null,
    ip: ctx.ip ?? null,
    visitor_id: lead.visitorId ?? null,
    bndryiq_estimate: lead.bndryiqEstimate ?? null,
    raw: {
      ...(lead as unknown as Record<string, unknown>),
      ...(ctx.linkToken ? { link_token: ctx.linkToken } : {}),
    },
  };

  if (lead.leadId) {
    // Bind the update to the visitor that owns the row. Without a visitorId we
    // can't prove ownership, so refuse rather than allow an unbounded update by
    // a guessable UUID. Legit two-step funnels (home-value) always carry it.
    if (!lead.visitorId) {
      console.warn(
        "[lead] update requested without visitorId; refusing unbounded update by id",
      );
      return null;
    }
    const { data, error } = await supabase
      .from("funnel_leads")
      .update(row)
      .eq("id", lead.leadId)
      .eq("visitor_id", lead.visitorId)
      .select("id")
      .single();
    if (error) {
      console.error("[lead] Supabase update failed:", error);
      return null;
    }
    return data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("funnel_leads")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    console.error("[lead] Supabase insert failed:", error);
    return null;
  }
  return data?.id ?? null;
}

// ── Email: notification to AJ ──────────────────────────────────────────────

async function sendNotificationEmail(lead: LeadInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[lead] RESEND_API_KEY is not set");
    return true; // treat as error
  }

  const resend = new Resend(apiKey);
  const srcLabel = sourceLabel[lead.source] ?? lead.source;
  const subject = `New ${srcLabel.toLowerCase()}: ${lead.name ?? lead.email ?? "anonymous"}`;

  const rows: Array<[string, string]> = [
    ["Source", srcLabel],
    ["Name", lead.name ?? "—"],
    ["Email", lead.email ?? "—"],
    ["Phone", lead.phone ?? "—"],
  ];
  if (lead.address) rows.push(["Address", lead.address]);
  if (lead.intent) rows.push(["Intent", intentLabel[lead.intent] ?? lead.intent]);
  if (lead.timeframe)
    rows.push(["Timeframe", timeframeLabel[lead.timeframe] ?? lead.timeframe]);
  rows.push(["SMS opt-in", lead.smsConsent ? "Yes" : "No"]);
  if (lead.utm?.source) rows.push(["UTM source", lead.utm.source]);
  if (lead.utm?.campaign) rows.push(["UTM campaign", lead.utm.campaign]);
  if (lead.referrer) rows.push(["Referrer", lead.referrer]);

  const text = [
    `New ${srcLabel.toLowerCase()} from anthonystolp.com`,
    "",
    ...rows.map(([k, v]) => `${k.padEnd(14)}: ${v}`),
    "",
    "Message:",
    lead.message?.trim() || "(none)",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;color:#1a1c1c;">
      <h2 style="font-weight:600;margin:0 0 16px;">New ${escapeHtml(srcLabel.toLowerCase())} from anthonystolp.com</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        <tbody>
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:6px 16px 6px 0;color:#666;">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
      ${
        lead.message?.trim()
          ? `<p style="margin-top:20px;color:#666;font-size:13px;">Message</p><p style="white-space:pre-wrap;border-left:2px solid #ddd;padding:0 12px;margin:6px 0;">${escapeHtml(lead.message.trim())}</p>`
          : ""
      }
    </div>
  `;

  const res = await resend.emails.send({
    from: `Anthony Stolp Site <${FROM_EMAIL}>`,
    to: TO_EMAIL,
    replyTo: lead.email ?? undefined,
    subject,
    text,
    html,
  });

  if (res.error) {
    console.error("[lead] Resend error:", res.error);
    return true;
  }
  return false;
}

// ── Email: auto-reply for home-value funnel ────────────────────────────────

async function sendHomeValueAutoReply(lead: LeadInput): Promise<void> {
  if (!lead.email) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const firstName = lead.name?.split(" ")[0] ?? "there";

  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for requesting a home value for:",
    `  ${lead.address ?? "your home"}`,
    "",
    "I will personally email you a clear, honest range within 24 hours. No automated Zestimate, no marketing fluff. Just real numbers based on your home, your neighborhood, and what is actually selling right now.",
    "",
    "If you have a moment, hit reply and let me know:",
    "  1. Any upgrades or improvements you have made",
    "  2. The timeframe you are considering",
    "",
    "Talk soon,",
    "Anthony Stolp",
    "ExSell Experts at Epique Realty",
    "anthony@exsellexperts.com",
    "(262) 885-3310",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;color:#1a1c1c;line-height:1.6;font-size:15px;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Thanks for requesting a home value for:<br><strong>${escapeHtml(lead.address ?? "your home")}</strong></p>
      <p>I will personally email you a clear, honest range within 24 hours. No automated Zestimate, no marketing fluff. Just real numbers based on your home, your neighborhood, and what is actually selling right now.</p>
      <p>If you have a moment, hit reply and let me know:</p>
      <ol style="padding-left:20px;">
        <li>Any upgrades or improvements you have made</li>
        <li>The timeframe you are considering</li>
      </ol>
      <p style="margin-top:32px;">Talk soon,<br>
        <strong>Anthony Stolp</strong><br>
        ExSell Experts at Epique Realty<br>
        <a href="mailto:anthony@exsellexperts.com" style="color:#1a1c1c;">anthony@exsellexperts.com</a><br>
        (262) 885-3310
      </p>
    </div>
  `;

  await resend.emails.send({
    from: `Anthony Stolp <${FROM_EMAIL}>`,
    to: lead.email,
    replyTo: TO_EMAIL,
    subject: "Your home value request is in",
    text,
    html,
  });
}

// ── Tracking backfill ──────────────────────────────────────────────────────

async function backfillTrackingEvents(
  leadId: string,
  visitorId: string,
): Promise<void> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return;
  }
  const { error } = await supabase
    .from("tracking_events")
    .update({ lead_id: leadId })
    .eq("visitor_id", visitorId)
    .is("lead_id", null);
  if (error) {
    console.error("[lead] tracking backfill error:", error);
  }
}

// ── AI draft (Claude) ──────────────────────────────────────────────────────

async function generateAndStoreDraft(
  leadId: string,
  lead: LeadInput,
): Promise<void> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return;
  }

  let recentEvents: LeadDraftInput["recentEvents"] = undefined;
  if (lead.visitorId) {
    const { data: events } = await supabase
      .from("tracking_events")
      .select("event, properties, created_at")
      .eq("visitor_id", lead.visitorId)
      .order("created_at", { ascending: true })
      .limit(20);
    if (events && events.length > 0) {
      recentEvents = events.map((e) => ({
        event: e.event as string,
        properties: (e.properties as Record<string, unknown> | null) ?? null,
        created_at: new Date(e.created_at as string).toISOString(),
      }));
    }
  }

  const draft = await generateDraft({
    source: lead.source,
    name: lead.name ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    address: lead.address ?? null,
    intent: lead.intent ?? null,
    timeframe: lead.timeframe ?? null,
    message: lead.message ?? null,
    bndryiqEstimate: lead.bndryiqEstimate ?? null,
    recentEvents,
  });

  if (!draft) return;

  const combined = `Subject: ${draft.subject}\n\n${draft.body}`;

  const { error } = await supabase
    .from("funnel_leads")
    .update({
      ai_draft: combined,
      ai_draft_model: draft.model,
      ai_draft_generated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) {
    console.error("[ai-draft] update failed:", error);
  }
}

// ── Farm outreach loop closer ──────────────────────────────────────────────

async function closeFarmOutreachLoop(
  leadId: string,
  targetId: string,
): Promise<void> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return;
  }

  const { data: outreach } = await supabase
    .from("farm_outreach")
    .select("id")
    .eq("farm_target_id", targetId)
    .is("response_lead_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (outreach?.id) {
    await supabase
      .from("farm_outreach")
      .update({ response_lead_id: leadId })
      .eq("id", outreach.id);
  }

  await supabase
    .from("farm_targets")
    .update({ status: "responded" })
    .eq("id", targetId);
}

// ── n8n webhook ────────────────────────────────────────────────────────────

async function fireN8nWebhook(
  lead: LeadInput,
  leadId: string | null,
): Promise<void> {
  if (!N8N_WEBHOOK_URL) return;
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "lead.completed",
      leadId,
      source: lead.source,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      intent: lead.intent,
      timeframe: lead.timeframe,
      address: lead.address,
      addressLine1: lead.addressLine1,
      city: lead.city,
      state: lead.state,
      postalCode: lead.postalCode,
      lat: lead.lat,
      lng: lead.lng,
      message: lead.message,
      smsConsent: lead.smsConsent ?? false,
      utm: lead.utm,
      referrer: lead.referrer,
      landingPage: lead.landingPage,
    }),
  });
  if (!res.ok) {
    console.error("[lead] n8n webhook non-2xx:", res.status);
  }
}

// ── Util ───────────────────────────────────────────────────────────────────

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  const escaped = name.replace(/[$()*+./?[\\\]^{|}-]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}
