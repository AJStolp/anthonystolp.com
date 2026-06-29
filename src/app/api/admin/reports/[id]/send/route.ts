import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { getAgentProfile, DEFAULT_AGENT_ID } from "@/lib/agent-profile";
import { applyComplianceFooter } from "@/lib/email-compliance";
import { escapeHtml } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

const RATE_LIMIT_MS = 80; // Resend allows ~100 req/s; stay well below

export async function POST(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { id } = await params;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = getSupabase();
  const { data: report, error: reportErr } = await supabase
    .from("market_reports")
    .select(
      "id,zip,month,subject,body_text,body_html,status,agent_id,sent_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (reportErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (report.status === "sent") {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }
  if (report.status !== "ready" && report.status !== "draft") {
    return NextResponse.json(
      { error: `Report status '${report.status}' is not sendable` },
      { status: 409 },
    );
  }

  // Fetch subscribers for this zip (source=market-report-subscribe).
  const { data: subscribers, error: subErr } = await supabase
    .from("funnel_leads")
    .select("id,email,name")
    .eq("source", "market-report-subscribe")
    .eq("postal_code", report.zip)
    .is("unsubscribed_at", null);
  if (subErr) {
    console.error("[admin/reports/send] subscriber fetch failed:", subErr);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
  const recipients = (subscribers ?? []).filter((s) => !!s.email);
  if (recipients.length === 0) {
    await supabase
      .from("market_reports")
      .update({ status: "sent", sent_at: new Date().toISOString(), sent_to_count: 0 })
      .eq("id", id);
    return NextResponse.json({ sent: 0, skipped: 0, message: "No subscribers" });
  }

  const agent = getAgentProfile(report.agent_id);
  const resend = new Resend(apiKey);
  let sent = 0;
  const errors: string[] = [];

  for (const sub of recipients) {
    if (!sub.email) continue;
    const firstName = (sub.name ?? "").split(" ")[0] || "there";
    const subject = report.subject;
    const personalizedText = report.body_text.replace(/\{\{first_name\}\}/g, firstName);
    const personalizedHtml = report.body_html.replace(
      /\{\{first_name\}\}/g,
      escapeHtml(firstName),
    );
    const { text, html, headers } = applyComplianceFooter({
      text: personalizedText,
      html: personalizedHtml,
      agent,
      leadId: sub.id,
    });

    try {
      const res = await resend.emails.send({
        from: `${agent.shortName} Stolp <${agent.fromEmail}>`,
        to: sub.email,
        replyTo: agent.replyToEmail,
        subject,
        text,
        html,
        headers,
      });
      if (res.error) {
        errors.push(`${sub.email}: ${res.error.message}`);
      } else {
        sent += 1;
      }
    } catch (err) {
      errors.push(
        `${sub.email}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  const finalStatus = errors.length === 0 ? "sent" : "failed";
  await supabase
    .from("market_reports")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      sent_to_count: sent,
    })
    .eq("id", id);

  return NextResponse.json({
    sent,
    recipients: recipients.length,
    errors,
  });
}
