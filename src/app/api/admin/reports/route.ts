import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("market_reports")
    .select(
      "id,zip,month,subject,model,draft_score,review_notes,status,generated_at,sent_at,sent_to_count",
    )
    .order("generated_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reports: data ?? [] });
}
