import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";

const STATUSES = ["new", "contacted", "working", "won", "lost"] as const;

const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
});


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

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

  const { data: prior, error: priorErr } = await supabase
    .from("funnel_leads")
    .select("id")
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
    console.error("[admin/leads] update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { id } = await params;
  const supabase = getSupabase();
  const { error } = await supabase.from("funnel_leads").delete().eq("id", id);
  if (error) {
    console.error("[admin/leads] delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
