import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  intent: z.enum(["buy", "sell", "both", "exploring"]),
  message: z.string().optional(),
  smsConsent: z.boolean().optional(),
  termsConsent: z.literal(true),
});

const FROM_EMAIL = process.env.LEAD_FROM_EMAIL ?? "hello@anthonystolp.com";
const TO_EMAIL = process.env.LEAD_TO_EMAIL ?? "anthony@exsellexperts.com";
const LOFTY_WEBHOOK_URL = process.env.LOFTY_WEBHOOK_URL;

const intentLabel: Record<string, string> = {
  buy: "Buy a home",
  sell: "Sell my home",
  both: "Buy and sell",
  exploring: "Just exploring",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid form data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const lead = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[lead] RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);

  const subject = `New lead: ${lead.name} (${intentLabel[lead.intent]})`;
  const lines = [
    `New lead from anthonystolp.com`,
    ``,
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    `Phone:   ${lead.phone ?? "—"}`,
    `Intent:  ${intentLabel[lead.intent]}`,
    `SMS OK:  ${lead.smsConsent ? "yes" : "no"}`,
    ``,
    `Message:`,
    lead.message?.trim() || "(none)",
  ];
  const text = lines.join("\n");

  const html = `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;color:#1a1c1c;">
      <h2 style="font-weight:600;margin:0 0 16px;">New lead from anthonystolp.com</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        <tbody>
          <tr><td style="padding:6px 16px 6px 0;color:#666;">Name</td><td>${escapeHtml(lead.name)}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;">Email</td><td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;">Phone</td><td>${lead.phone ? escapeHtml(lead.phone) : "—"}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;">Intent</td><td>${intentLabel[lead.intent]}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666;">SMS opt-in</td><td>${lead.smsConsent ? "Yes" : "No"}</td></tr>
        </tbody>
      </table>
      ${lead.message?.trim() ? `<p style="margin-top:20px;color:#666;font-size:13px;">Message</p><p style="white-space:pre-wrap;border-left:2px solid #ddd;padding:0 12px;margin:6px 0;">${escapeHtml(lead.message.trim())}</p>` : ""}
    </div>
  `;

  // Send email; fail loud if Resend errors.
  const emailRes = await resend.emails.send({
    from: `Anthony Stolp Site <${FROM_EMAIL}>`,
    to: [TO_EMAIL],
    replyTo: lead.email,
    subject,
    text,
    html,
  });

  if (emailRes.error) {
    console.error("[lead] Resend error", emailRes.error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 502 },
    );
  }

  // Best-effort POST to Lofty CRM webhook (non-blocking for the user).
  if (LOFTY_WEBHOOK_URL) {
    try {
      const loftyRes = await fetch(LOFTY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          intent: lead.intent,
          message: lead.message,
          smsConsent: lead.smsConsent ?? false,
          source: "anthonystolp.com",
        }),
      });
      if (!loftyRes.ok) {
        console.error(
          "[lead] Lofty webhook returned non-2xx:",
          loftyRes.status,
        );
      }
    } catch (err) {
      console.error("[lead] Lofty webhook failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

