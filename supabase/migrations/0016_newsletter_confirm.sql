-- 0016_newsletter_confirm.sql: double opt-in for The River Report (T-113).
--
-- A market-report-subscribe row is on the list once its confirm link has been
-- clicked. /api/newsletter/confirm sets this on every row with that email.
-- No backfill: production had no subscribers to carry over (funnel_leads was
-- emptied on 2026-11-20 under T-055).

alter table funnel_leads add column if not exists newsletter_confirmed_at timestamptz;
