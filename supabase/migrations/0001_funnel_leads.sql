-- funnel_leads — single source of truth for every lead-capture funnel on anthonystolp.com.
-- Each funnel (contact form, home value, buyer guide, exit-intent, etc.) writes here
-- with a distinct `source` value. funnel_step tracks partial-funnel attribution
-- (e.g. home-value step 1 captures the address; step 2 fills in contact info).

create extension if not exists "uuid-ossp";

create table if not exists public.funnel_leads (
  id              uuid primary key default uuid_generate_v4(),

  -- Funnel attribution
  source          text not null,                -- 'contact-form' | 'home-value' | 'buyer-guide' | ...
  funnel_step     text not null default 'completed',  -- 'address-only' | 'completed' | etc.

  -- Property / address (nullable for funnels that don't collect one)
  address         text,
  address_line1   text,
  city            text,
  state           text,
  postal_code     text,
  lat             double precision,
  lng             double precision,
  mapbox_id       text,                         -- Mapbox feature id for re-lookup

  -- Contact (nullable so step-1 partial leads can save with just an address)
  name            text,
  email           text,
  phone           text,

  -- Intent signals
  intent          text,                         -- 'buy' | 'sell' | 'both' | 'exploring'
  timeframe       text,                         -- '1-3mo' | '3-6mo' | '6-12mo' | 'curious' | 'refinancing'
  message         text,

  -- Consent
  sms_consent     boolean not null default false,
  terms_consent   boolean not null default false,

  -- Attribution / context
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  referrer        text,
  landing_page    text,
  user_agent      text,
  ip              text,

  -- Raw submission payload, kept for debugging / future schema migrations
  raw             jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Hot query paths: filtering by source + recency, lookups by email, partial-funnel reporting.
create index if not exists idx_funnel_leads_source_created
  on public.funnel_leads (source, created_at desc);

create index if not exists idx_funnel_leads_email
  on public.funnel_leads (email)
  where email is not null;

create index if not exists idx_funnel_leads_step
  on public.funnel_leads (funnel_step, created_at desc);

-- updated_at auto-bump
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_funnel_leads_updated_at on public.funnel_leads;
create trigger trg_funnel_leads_updated_at
  before update on public.funnel_leads
  for each row execute function public.set_updated_at();

-- RLS: enabled, but server writes use service_role which bypasses policies.
-- No public policies are granted, so anon/auth clients cannot read or write
-- without going through our Next.js API route.
alter table public.funnel_leads enable row level security;
