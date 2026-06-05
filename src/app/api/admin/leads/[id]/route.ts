import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase-server";

const STATUSES = ["new", "contacted", "working", "won", "lost"] as const;

const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid patch", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const patch = parsed.data;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch prior status so we can fire a status-change webhook to n8n.
  const { data: prior, error: priorErr } = await supabase
    .from("funnel_leads")
    .select(
      "id,status,source,name,email,phone,address,timeframe,intent,agent_id",
    )
    .eq("id", id)
    .single();
  if (priorErr || !prior) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("funnel_leads")
    .update(patch)
    .eq("id", id)
    .select(
      "id,source,funnel_step,status,name,email,phone,address,timeframe,intent,message,notes,utm_source,utm_campaign,ai_draft,created_at,status_changed_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (
    patch.status &&
    patch.status !== prior.status &&
    N8N_WEBHOOK_URL
  ) {
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "lead.status_changed",
        leadId: id,
        fromStatus: prior.status,
        toStatus: patch.status,
        source: prior.source,
        name: prior.name,
        email: prior.email,
        phone: prior.phone,
        address: prior.address,
        timeframe: prior.timeframe,
        intent: prior.intent,
        agentId: prior.agent_id,
      }),
    }).catch((err) => {
      console.error("[admin/leads] n8n status webhook failed:", err);
    });
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabase();
  const { error } = await supabase.from("funnel_leads").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
