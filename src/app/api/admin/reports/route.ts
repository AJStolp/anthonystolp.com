import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("market_reports")
    .select(
      "id,zip,month,subject,model,draft_score,review_notes,status,generated_at,sent_at,sent_to_count",
    )
    .order("generated_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/reports] list failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
  return NextResponse.json({ reports: data ?? [] });
}
