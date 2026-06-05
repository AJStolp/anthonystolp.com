-- Phase 3: cross-domain visitor tracking + persisted bndryiq estimate.
--
-- visitor_id is minted by the parent (anthonystolp.com) and passed into the
-- bndryiq iframe so events on both domains can be joined later.
-- tracking_events stores anonymous activity; when a lead identifies, lead_id
-- is filled in and prior anonymous events become attributable.

alter table public.funnel_leads
  add column if not exists visitor_id text,
  add column if not exists bndryiq_estimate jsonb;

create index if not exists idx_funnel_leads_visitor
  on public.funnel_leads (visitor_id)
  where visitor_id is not null;

-- ── tracking_events ────────────────────────────────────────────────────────

create table if not exists public.tracking_events (
  id            uuid primary key default uuid_generate_v4(),
  visitor_id    text not null,
  agent_id      uuid,
  lead_id       uuid references public.funnel_leads(id) on delete set null,
  event         text not null,                -- 'page_view' | 'address_lookup' | 'estimate_seen' | 'form_started' | 'lead_submitted' | 'return_visit' | ...
  properties    jsonb,
  path          text,
  referrer      text,
  user_agent    text,
  ip            text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_tracking_visitor_created
  on public.tracking_events (visitor_id, created_at desc);

create index if not exists idx_tracking_lead
  on public.tracking_events (lead_id)
  where lead_id is not null;

create index if not exists idx_tracking_event_created
  on public.tracking_events (event, created_at desc);

create index if not exists idx_tracking_agent_event
  on public.tracking_events (agent_id, event, created_at desc)
  where agent_id is not null;

alter table public.tracking_events enable row level security;
