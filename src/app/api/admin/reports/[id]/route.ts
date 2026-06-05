import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function GET(_req: Request, { params }: RouteParams) {
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

export async function PATCH(req: Request, { params }: RouteParams) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ report: data });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("market_reports")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
