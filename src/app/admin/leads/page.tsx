import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { InboxClient, type LeadRow } from "@/components/admin/InboxClient";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

const TABS = {
  active: ["new", "contacted", "working"],
  closed: ["won", "lost"],
  partial: [], // funnel_step='address-only' regardless of status
} as const;

type TabKey = keyof typeof TABS;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey =
    rawTab === "closed" || rawTab === "partial" ? rawTab : "active";

  const supabase = getSupabase();
  let query = supabase
    .from("funnel_leads")
    .select(
      "id,source,funnel_step,status,name,email,phone,address,timeframe,intent,message,notes,utm_source,utm_campaign,ai_draft,created_at,status_changed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (tab === "partial") {
    query = query.eq("funnel_step", "address-only");
  } else {
    query = query
      .eq("funnel_step", "completed")
      .in("status", TABS[tab] as readonly string[]);
  }

  const { data, error } = await query;
  if (error) {
    return (
      <main className="min-h-dvh bg-cream px-6 py-20 text-ink">
        <p className="text-accent">Error loading leads: {error.message}</p>
      </main>
    );
  }

  const leads = (data ?? []) as LeadRow[];

  const counts = await fetchCounts();

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-4 pb-3">
          <AdminNavLinks current="leads" />
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
              Inbox
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Leads
            </h1>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-6 px-6 pb-3 text-[12px] uppercase tracking-[0.24em]">
          <TabLink href="/admin/leads?tab=active" active={tab === "active"}>
            Active ({counts.active})
          </TabLink>
          <TabLink href="/admin/leads?tab=closed" active={tab === "closed"}>
            Closed ({counts.closed})
          </TabLink>
          <TabLink href="/admin/leads?tab=partial" active={tab === "partial"}>
            Partial ({counts.partial})
          </TabLink>
        </nav>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {leads.length === 0 ? (
          <p className="text-ink-soft/60">No leads in this view.</p>
        ) : (
          <InboxClient initialLeads={leads} />
        )}
      </div>
    </main>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-ink pb-2 text-ink"
          : "pb-2 text-ink-soft/55 hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}

async function fetchCounts() {
  const supabase = getSupabase();
  const [activeRes, closedRes, partialRes] = await Promise.all([
    supabase
      .from("funnel_leads")
      .select("id", { count: "exact", head: true })
      .eq("funnel_step", "completed")
      .in("status", TABS.active as readonly string[]),
    supabase
      .from("funnel_leads")
      .select("id", { count: "exact", head: true })
      .eq("funnel_step", "completed")
      .in("status", TABS.closed as readonly string[]),
    supabase
      .from("funnel_leads")
      .select("id", { count: "exact", head: true })
      .eq("funnel_step", "address-only"),
  ]);
  return {
    active: activeRes.count ?? 0,
    closed: closedRes.count ?? 0,
    partial: partialRes.count ?? 0,
  };
}
