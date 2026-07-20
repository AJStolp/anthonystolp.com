-- 0011_properties.sql — DB-driven property / open-house pages.
--
-- Each row defines a /property/[slug] page: a property showcase plus an
-- open-house sign-in form. Sign-ins flow through /api/lead into funnel_leads
-- (tagged with property_slug) and are pushed to Lofty as new leads.
-- Toggling status unpublishes without deleting state (closed → off the site).

create table if not exists public.properties (
  slug             text primary key,
  status           text not null default 'coming_soon'
                     check (status in ('coming_soon', 'active', 'closed')),
  address          text not null,
  city             text,
  state            text,
  postal_code      text,
  price            integer,
  beds             numeric,
  baths            numeric,
  sqft             integer,
  description      text,
  photo_url        text,
  open_house_at    timestamptz,
  -- Optional lender slot: renders on the page only when populated.
  lender_name      text,
  lender_photo_url text,
  lender_contact   text,
  agent_id         uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_properties_status_created
  on public.properties (status, created_at desc);

create or replace function public.set_properties_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_properties_updated_at();

alter table public.properties enable row level security;

-- Lead attribution: which property a sign-in came from, and whether the
-- guest is already represented by an agent.
alter table public.funnel_leads
  add column if not exists property_slug text,
  add column if not exists has_agent text;

create index if not exists idx_funnel_leads_property
  on public.funnel_leads (property_slug, created_at desc)
  where property_slug is not null;
