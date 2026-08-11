-- 0014_click_ids.sql — paid-click identifiers on the lead row.
--
-- The utm_* columns from 0001 say which campaign sent a visitor, but they
-- cannot close the loop back to the ad platform. That needs the click id the
-- platform stamps on the landing URL, which is unrecoverable after the fact:
-- a click that lands before this column exists can never be attributed.
--
-- wbraid and gbraid are Google's iOS-privacy click ids and arrive instead of
-- gclid, never alongside it, so all three are stored separately rather than
-- collapsed into one column. msclkid is Microsoft Ads, fbclid is Meta.
--
-- click_at is when the click id was first seen. Google drops an offline
-- conversion uploaded more than 90 days after the click, so the upload job
-- needs the click's age to skip rows that are already past the window.

alter table public.funnel_leads
  add column if not exists gclid    text,
  add column if not exists wbraid   text,
  add column if not exists gbraid   text,
  add column if not exists msclkid  text,
  add column if not exists fbclid   text,
  add column if not exists click_at timestamptz;

-- The offline-conversion upload selects leads by click id.
create index if not exists idx_funnel_leads_gclid
  on public.funnel_leads (gclid)
  where gclid is not null;
