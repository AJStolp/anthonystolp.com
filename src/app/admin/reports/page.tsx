import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";

export const metadata: Metadata = {
  title: "Market reports",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  zip: string;
  month: string;
  subject: string;
  draft_score: number | null;
  status: string;
  sent_at: string | null;
  sent_to_count: number;
  generated_at: string;
};

export default async function AdminReportsIndex() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("market_reports")
    .select(
      "id,zip,month,subject,draft_score,status,sent_at,sent_to_count,generated_at",
    )
    .order("generated_at", { ascending: false })
    .limit(100);
  const reports = (data ?? []) as ReportRow[];

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-4 pb-3">
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
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
              Admin
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Market reports
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="text-accent">Error: {error.message}</p>
        ) : reports.length === 0 ? (
          <p className="text-ink-soft/60">
            No reports yet. They will appear on the 1st of each month after the
            cron runs, or after a manual trigger of{" "}
            <code className="text-[12px]">/api/cron/market-reports</code>.
          </p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-ink/15 text-left text-[11px] uppercase tracking-[0.24em] text-ink-soft/60">
                <th className="py-3 pr-4">Month</th>
                <th className="py-3 pr-4">Zip</th>
                <th className="py-3 pr-4">Subject</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Sent</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-ink/10">
                  <td className="py-3 pr-4 text-ink-soft/80">
                    {r.month.slice(0, 7)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-ink">{r.zip}</td>
                  <td className="py-3 pr-4 text-ink">{r.subject}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="py-3 pr-4 text-ink-soft/80">
                    {r.draft_score ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft/60">
                    {r.sent_at
                      ? `${r.sent_to_count} on ${new Date(r.sent_at).toLocaleDateString()}`
                      : "—"}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/reports/${r.id}`}
                      className="text-[11px] uppercase tracking-[0.24em] text-ink underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "sent"
      ? "bg-ink text-cream"
      : status === "ready"
        ? "bg-accent-soft/30 text-ink"
        : status === "failed"
          ? "bg-accent/20 text-accent"
          : "bg-ink/10 text-ink-soft";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] ${color}`}
    >
      {status}
    </span>
  );
}
