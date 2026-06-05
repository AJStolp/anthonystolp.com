import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase-server";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { ReportEditor } from "@/components/admin/ReportEditor";

export const metadata: Metadata = {
  title: "Edit market report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export default async function EditMarketReport({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const supabase = getSupabase();
  const { data: report } = await supabase
    .from("market_reports")
    .select(
      "id,zip,month,subject,body_text,body_html,status,draft_score,review_notes,sent_to_count",
    )
    .eq("id", id)
    .maybeSingle();
  if (!report) notFound();

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-4 pb-3">
          <AdminNavLinks current="reports" />
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/60 underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
              Admin / Reports
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              {report.month.slice(0, 7)} · {report.zip}
            </h1>
          </div>
          <Link
            href="/admin/reports"
            className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/70 hover:text-ink"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <ReportEditor report={report} />
      </div>
    </main>
  );
}
