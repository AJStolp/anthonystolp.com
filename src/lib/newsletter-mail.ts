// The River Report's double opt-in (T-113): the confirm email sent after a
// signup, the signed confirm link, and the welcome email sent once it is
// clicked. Supabase is the list: a market-report-subscribe row in
// funnel_leads, confirmed once newsletter_confirmed_at is set.
//
// Newsletter mail goes from the news. subdomain only, so the root domain's
// reputation (lead alerts, home value replies) is never spent on it. It sends
// with NEWSLETTER_RESEND_API_KEY, a Resend key restricted to that subdomain,
// and never with RESEND_API_KEY, which only sends from the root domain. Until
// NEWSLETTER_FROM_EMAIL names an address there and NEWSLETTER_RESEND_API_KEY
// is set, nothing is sent: the lead is still saved, and a warning is logged.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { getAgentProfile, type AgentProfile } from "./agent-profile";
import { applyComplianceFooter } from "./email-compliance";
import { NEWSLETTER_NAME, NEWSLETTER_SOURCE } from "./newsletter";
import { escapeHtml } from "./utils";

// ── Signed confirm links ───────────────────────────────────────────────────
//
// Made like unsubscribeToken(), over "confirm:" plus the lead id, so a confirm
// token never verifies as an unsubscribe token and the reverse. Unlike the
// unsubscribe signer there is no development default: with no secret set,
// signing throws and no confirm link goes out.

function confirmSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    throw new Error(
      "[newsletter] No UNSUBSCRIBE_SECRET or CRON_SECRET set. Refusing to sign confirm links.",
    );
  }
  return secret;
}

export function confirmToken(leadId: string): string {
  return createHmac("sha256", confirmSecret())
    .update(`confirm:${leadId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyConfirmToken(leadId: string, token: string): boolean {
  const expected = confirmToken(leadId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildConfirmUrl(agent: AgentProfile, leadId: string): string {
  return `https://${agent.websiteDomain}/api/newsletter/confirm?lid=${encodeURIComponent(leadId)}&t=${confirmToken(leadId)}`;
}

// ── Sender ─────────────────────────────────────────────────────────────────

const fromAddress = z.string().trim().toLowerCase().email();

// "Anthony Stolp <anthony@news.anthonystolp.com>", or null when
// NEWSLETTER_FROM_EMAIL is unset or not on the news. subdomain. Never the root
// domain.
export function newsletterFrom(agent: AgentProfile): string | null {
  const parsed = fromAddress.safeParse(process.env.NEWSLETTER_FROM_EMAIL ?? "");
  if (!parsed.success) return null;
  if (!parsed.data.endsWith(`@news.${agent.websiteDomain}`)) return null;
  return `${agent.name} <${parsed.data}>`;
}

type Message = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

// Sends one newsletter email, or logs why it did not. True when Resend took it.
async function sendNewsletterMail(agent: AgentProfile, msg: Message): Promise<boolean> {
  const from = newsletterFrom(agent);
  if (!from) {
    console.warn(
      `[newsletter] NEWSLETTER_FROM_EMAIL is unset or not on news.${agent.websiteDomain}; not sending "${msg.subject}".`,
    );
    return false;
  }
  const apiKey = process.env.NEWSLETTER_RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[newsletter] NEWSLETTER_RESEND_API_KEY is not set; not sending "${msg.subject}".`);
    return false;
  }
  const res = await new Resend(apiKey).emails.send({
    from,
    replyTo: agent.replyToEmail,
    ...msg,
  });
  if (res.error) {
    console.error("[newsletter] Resend error:", res.error);
    return false;
  }
  return true;
}

// ── Confirm email ──────────────────────────────────────────────────────────

export type Signup = { leadId: string; email: string; firstName?: string };

export type ConfirmSendResult = "sent" | "already-confirmed" | "not-sent";

/**
 * After a signup row is saved: send the confirm email, unless this email is
 * already confirmed and still subscribed. Then the new row is stamped
 * confirmed too and no second confirm email goes out. The signup form shows
 * the same success state either way.
 */
export async function sendNewsletterConfirm(
  db: SupabaseClient,
  signup: Signup,
): Promise<ConfirmSendResult> {
  const agent = getAgentProfile();

  const { data: confirmed, error } = await db
    .from("funnel_leads")
    .select("id")
    .eq("source", NEWSLETTER_SOURCE)
    .eq("email", signup.email)
    .not("newsletter_confirmed_at", "is", null)
    .is("unsubscribed_at", null)
    .limit(1);
  // A failed lookup sends the confirm anyway: a duplicate confirm email is
  // better than a signup that never hears back.
  if (error) console.error("[newsletter] confirmed lookup failed:", error);

  if (confirmed && confirmed.length > 0) {
    const { error: stampError } = await db
      .from("funnel_leads")
      .update({ newsletter_confirmed_at: new Date().toISOString() })
      .eq("id", signup.leadId);
    if (stampError) console.error("[newsletter] stamping repeat signup failed:", stampError);
    return "already-confirmed";
  }

  const sent = await sendNewsletterMail(agent, confirmEmail(agent, signup));
  return sent ? "sent" : "not-sent";
}

function greeting(firstName: string | undefined): string {
  return firstName?.trim() || "there";
}

// A hidden preview line most inboxes show beside the subject.
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(text)}</div>`;
}

function confirmEmail(agent: AgentProfile, signup: Signup): Message {
  const url = buildConfirmUrl(agent, signup.leadId);
  const name = greeting(signup.firstName);
  const intro = `Thanks for signing up for ${NEWSLETTER_NAME}. Click below to confirm and you'll get the next issue the first Tuesday of the month.`;
  const ignore = "If you didn't sign up, ignore this and you won't hear from me.";

  const text = [
    `Hi ${name},`,
    "",
    intro,
    "",
    `Confirm my signup: ${url}`,
    "",
    ignore,
    "",
    agent.name,
    agent.brokerage,
    agent.mobilePhone,
  ].join("\n");

  const html = `${preheader("One click and you're in.")}
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;color:#1a1c1c;line-height:1.6;font-size:15px;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>${escapeHtml(intro)}</p>
      <p style="margin:28px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1a1c1c;color:#ffffff;padding:12px 24px;text-decoration:none;">Confirm my signup</a></p>
      <p>${escapeHtml(ignore)}</p>
      <p style="margin-top:28px;">${escapeHtml(agent.name)}<br>${escapeHtml(agent.brokerage)}<br>${escapeHtml(agent.mobilePhone)}</p>
    </div>`;

  return { to: signup.email, subject: "Confirm your River Report signup", text, html };
}

// ── Confirm click ──────────────────────────────────────────────────────────

export type ConfirmResult = "confirmed" | "invalid" | "error";

/**
 * The confirm link's click. A good token confirms every signup row with that
 * email and clears unsubscribed_at on them (the only path that clears it),
 * then sends the welcome email. A link already used is still "confirmed", with
 * no second welcome.
 */
export async function confirmNewsletter(
  db: SupabaseClient,
  leadId: string,
  token: string,
): Promise<ConfirmResult> {
  let valid: boolean;
  try {
    valid = verifyConfirmToken(leadId, token);
  } catch (err) {
    console.error("[newsletter] cannot verify confirm link:", err);
    return "error";
  }
  if (!valid) return "invalid";

  const { data: lead, error } = await db
    .from("funnel_leads")
    .select("id,agent_id,email,name,source,newsletter_confirmed_at,unsubscribed_at")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    console.error("[newsletter] confirm lookup failed:", error);
    return "error";
  }
  if (!lead || lead.source !== NEWSLETTER_SOURCE || !lead.email) return "invalid";
  if (lead.newsletter_confirmed_at && !lead.unsubscribed_at) return "confirmed";

  const { error: updateError } = await db
    .from("funnel_leads")
    .update({ newsletter_confirmed_at: new Date().toISOString(), unsubscribed_at: null })
    .eq("source", NEWSLETTER_SOURCE)
    .eq("email", lead.email);
  if (updateError) {
    console.error("[newsletter] confirm update failed:", updateError);
    return "error";
  }

  const agent = getAgentProfile(lead.agent_id as string | null);
  try {
    await sendNewsletterMail(
      agent,
      welcomeEmail(agent, {
        leadId: lead.id as string,
        email: lead.email as string,
        firstName: ((lead.name as string | null) ?? "").split(" ")[0],
      }),
    );
  } catch (err) {
    console.error("[newsletter] welcome email failed:", err);
  }
  return "confirmed";
}

// ── Welcome email ──────────────────────────────────────────────────────────

// The first River Report mail, so it carries the compliance footer: the
// postal address and the unsubscribe link and headers.
function welcomeEmail(agent: AgentProfile, signup: Signup): Message {
  const name = greeting(signup.firstName);
  const homeValue = `https://${agent.websiteDomain}/home-value`;
  const lines = [
    `You're in. Once a month you'll get a short read on Ozaukee and Washington County real estate: local news, the real numbers with sources, and a quick read on your zip if you picked one.`,
    `One thing I can do for you today: text me your street at ${agent.mobilePhone} and I'll send what nearby homes sold for. Or if you want an actual number for your place, here's my free home value: ${homeValue}`,
  ];
  const closing = `${agent.name}, Realtor, ${agent.brokerage}. I'm a local agent backed by a strong team, and you always work with me.`;

  const text = [
    `Hi ${name},`,
    "",
    lines[0],
    "",
    lines[1],
    "",
    "Talk soon,",
    agent.shortName,
    "",
    closing,
  ].join("\n");

  const html = `${preheader("What to expect, plus one thing I can do for you right now.")}
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;color:#1a1c1c;line-height:1.6;font-size:15px;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>${escapeHtml(lines[0])}</p>
      <p>${escapeHtml(lines[1].replace(homeValue, "")).trimEnd()} <a href="${escapeHtml(homeValue)}" style="color:#1a1c1c;">${escapeHtml(homeValue)}</a></p>
      <p style="margin-top:28px;">Talk soon,<br>${escapeHtml(agent.shortName)}</p>
      <p style="color:#666;font-size:13px;">${escapeHtml(closing)}</p>
    </div>`;

  const withFooter = applyComplianceFooter({ html, text, agent, leadId: signup.leadId });
  return {
    to: signup.email,
    subject: "You're on the list",
    text: withFooter.text,
    html: withFooter.html,
    headers: withFooter.headers,
  };
}
