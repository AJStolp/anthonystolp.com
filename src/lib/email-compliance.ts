// CAN-SPAM compliance for market-report emails (commercial mail).
//
// Every market-report send must carry (1) a working unsubscribe mechanism and
// (2) a valid physical postal address. We append both deterministically at
// send time rather than trusting the LLM to include them, so they can never be
// dropped. We also linkify the Redfin attribution here, since Redfin Data
// Center asks for a link to Redfin on first reference.
//
// Unsubscribe links are stateless: the token is an HMAC of the lead id, so the
// link is unguessable and non-enumerable with no token table to maintain.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { AgentProfile } from "./agent-profile";

const REDFIN_DATA_CENTER_URL = "https://www.redfin.com/news/data-center/";

// Secret for signing unsubscribe links. UNSUBSCRIBE_SECRET preferred; fall back
// to CRON_SECRET (always set in prod) so links never break, then a dev default.
function signingSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[email-compliance] No UNSUBSCRIBE_SECRET or CRON_SECRET set in production. Refusing to sign unsubscribe links with an insecure default.",
    );
  }
  return "dev-only-unsubscribe-secret";
}

export function unsubscribeToken(leadId: string): string {
  return createHmac("sha256", signingSecret())
    .update(leadId)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const expected = unsubscribeToken(leadId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(
  agent: AgentProfile,
  leadId: string,
): string {
  const token = unsubscribeToken(leadId);
  return `https://${agent.websiteDomain}/unsubscribe?lid=${encodeURIComponent(leadId)}&t=${token}`;
}

/**
 * Take an already-personalized (first-name-substituted) email body and return
 * the legally-complete version: Redfin attribution linked, plus a footer with
 * the physical address and a per-recipient unsubscribe link. Also returns the
 * List-Unsubscribe headers for native one-click unsubscribe in Gmail/Apple Mail.
 */
export function applyComplianceFooter(args: {
  html: string;
  text: string;
  agent: AgentProfile;
  leadId: string;
}): { html: string; text: string; headers: Record<string, string> } {
  const { agent, leadId } = args;
  const unsubUrl = buildUnsubscribeUrl(agent, leadId);

  // Linkify the first "Redfin Data Center" mention in the HTML body (String
  // .replace with a string target replaces only the first occurrence).
  const html =
    args.html.replace(
      "Redfin Data Center",
      `<a href="${REDFIN_DATA_CENTER_URL}">Redfin Data Center</a>`,
    ) + htmlFooter(agent, unsubUrl);

  const text = args.text + textFooter(agent, unsubUrl);

  return {
    html,
    text,
    headers: {
      // RFC 8058 one-click. The URL accepts a POST (see /api/unsubscribe).
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function htmlFooter(agent: AgentProfile, unsubUrl: string): string {
  return [
    `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />`,
    `<p style="font-size:12px;line-height:1.5;color:#888">`,
    `You are receiving this because you subscribed to ${agent.name}'s local market updates. `,
    `<a href="${unsubUrl}" style="color:#888">Unsubscribe</a>.`,
    `</p>`,
    `<p style="font-size:12px;line-height:1.5;color:#888">${agent.mailingAddress}</p>`,
  ].join("");
}

function textFooter(agent: AgentProfile, unsubUrl: string): string {
  return [
    "",
    "",
    `You are receiving this because you subscribed to ${agent.name}'s local market updates.`,
    `Unsubscribe: ${unsubUrl}`,
    "",
    agent.mailingAddress,
  ].join("\n");
}
