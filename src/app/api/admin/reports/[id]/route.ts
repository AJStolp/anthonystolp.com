import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";

type RouteParams = { params: Promise<{ id: string }> };

const PatchSchema = z
  .object({
    subject: z.string().min(1).max(200).optional(),
    body_text: z.string().min(1).optional(),
    body_html: z.string().min(1).optional(),
    status: z.enum(["draft", "ready", "skipped"]).optional(),
  })
  .strict();

export async function GET(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { id } = await params;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("market_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ report: data });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid patch", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("market_reports")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("[admin/reports] update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ report: data });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { id } = await params;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("market_reports")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[admin/reports] delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
