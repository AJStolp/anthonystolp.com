-- 0008_unsubscribe.sql — CAN-SPAM opt-out for market-report subscribers.
--
-- Market reports are commercial email, so every send must carry a working
-- unsubscribe and we must stop sending once someone opts out. We track opt-out
-- on the funnel_leads row itself; unsubscribing flips this for every
-- market-report-subscribe row sharing that email (one person can subscribe to
-- multiple zips). All three subscriber queries filter `unsubscribed_at is null`.

alter table public.funnel_leads
  add column if not exists unsubscribed_at timestamptz;

-- Small partial index for opt-out audits / suppression-list exports.
create index if not exists idx_funnel_leads_unsubscribed
  on public.funnel_leads (email)
  where unsubscribed_at is not null;
