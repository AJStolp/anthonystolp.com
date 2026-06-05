-- 0007_market_reports.sql — automated monthly market-report pipeline.
--
-- Three tables:
--   market_stats          — raw per-zip stats by month (source: redfin | mls | manual)
--   market_reports        — per-zip drafted email reports (draft → ready → sent)
--   (subscribers live in funnel_leads with source='market-report-subscribe')
--
-- Flow:
--   1. Cron pulls stats monthly into market_stats
--   2. For each zip with stats + subscribers, Claude drafts a per-zip report
--   3. Claude self-reviews against a rubric; sets review_score + review_notes
--   4. AJ approves in /admin/reports → broadcast via Resend to that zip's subscribers
--   5. After 3 clean cycles, AUTO_SEND env flag flips to skip the human gate

-- ── market_stats ────────────────────────────────────────────────────────────

create table if not exists public.market_stats (
  id              uuid primary key default uuid_generate_v4(),
  zip             text not null,
  month           date not null,                          -- first day of month, e.g. 2026-06-01
  median_price    numeric(12, 2),
  avg_price       numeric(12, 2),
  median_dom      integer,                                -- days on market
  inventory_count integer,
  sales_count     integer,
  mom_pct         numeric(6, 2),                          -- month-over-month % change in median price
  yoy_pct         numeric(6, 2),                          -- year-over-year % change
  source          text not null check (source in ('redfin', 'mls', 'manual')),
  raw             jsonb,                                  -- original row from upstream source
  agent_id        uuid,
  created_at      timestamptz not null default now()
);

create unique index if not exists idx_market_stats_zip_month
  on public.market_stats (zip, month);

create index if not exists idx_market_stats_month
  on public.market_stats (month desc);

alter table public.market_stats enable row level security;

-- ── market_reports ──────────────────────────────────────────────────────────

create table if not exists public.market_reports (
  id              uuid primary key default uuid_generate_v4(),
  zip             text not null,
  month           date not null,
  subject         text not null,
  body_html       text not null,
  body_text       text not null,
  model           text,                                   -- Claude model used
  draft_score     integer,                                -- self-review 0-100
  review_notes    text,                                   -- self-review notes
  status          text not null default 'draft'
                  check (status in ('draft', 'ready', 'sent', 'failed', 'skipped')),
  generated_at    timestamptz not null default now(),
  sent_at         timestamptz,
  sent_to_count   integer not null default 0,
  agent_id        uuid
);

create unique index if not exists idx_market_reports_zip_month
  on public.market_reports (zip, month);

create index if not exists idx_market_reports_status_generated
  on public.market_reports (status, generated_at desc);

create index if not exists idx_market_reports_agent_created
  on public.market_reports (agent_id, generated_at desc)
  where agent_id is not null;

alter table public.market_reports enable row level security;
