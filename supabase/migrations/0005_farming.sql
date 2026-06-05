-- 0005_farming.sql — just-sold farming engine schema.
--
-- Flow: MLS feed drops a sold listing into sold_listings → per-county parcel
-- lookup spawns farm_targets (neighbors within radius) → admin approves
-- selected targets → outreach (postcard via Lob, email fallback via Resend)
-- writes a farm_outreach row → /n/[token] hit ties response visits back via
-- the qr_token on the target → /api/lead links the response_lead_id back
-- to the originating outreach.

-- ── sold_listings ──────────────────────────────────────────────────────────
-- Immutable source-of-truth for MLS-sourced sale facts. mls_id is the natural
-- key for idempotent upserts when a digest gets re-sent. source identifies
-- the ingest path so we can pull v0 csv rows when validating v1 digest parser.

create table if not exists public.sold_listings (
  id              uuid primary key default uuid_generate_v4(),
  mls_id          text unique,
  address         text not null,
  city            text,
  state           text,
  postal_code     text,
  lat             double precision,
  lng             double precision,
  sold_price      numeric(12, 2),
  sold_date       date,
  bedrooms        integer,
  bathrooms       numeric(4, 1),
  sqft            integer,
  property_class  text,
  source          text not null,                  -- 'csv' | 'mls_digest' | 'reso'
  raw             jsonb,
  raw_email_html  text,                           -- preserved digest body for offline re-parse
  agent_id        uuid,
  created_at      timestamptz not null default now()
);

create index if not exists idx_sold_listings_agent_created
  on public.sold_listings (agent_id, created_at desc)
  where agent_id is not null;

create index if not exists idx_sold_listings_sold_date
  on public.sold_listings (sold_date desc);

create index if not exists idx_sold_listings_postal
  on public.sold_listings (postal_code, sold_date desc)
  where postal_code is not null;

alter table public.sold_listings enable row level security;

-- ── farm_targets ───────────────────────────────────────────────────────────
-- One row per neighbor identified by the per-county parcel provider. Status
-- drives the admin approval workflow. qr_token references link_tokens.token
-- so /n/[qr_token] hits resolve back to the originating target.

create table if not exists public.farm_targets (
  id                          uuid primary key default uuid_generate_v4(),
  sold_listing_id             uuid not null references public.sold_listings(id) on delete cascade,
  parcel_id                   text,
  owner_name                  text,
  mailing_address             text,
  mailing_address_validated   boolean not null default false,
  target_lat                  double precision,
  target_lng                  double precision,
  distance_m                  numeric(10, 2),
  qr_token                    text references public.link_tokens(token) on delete set null,
  status                      text not null default 'pending'
                              check (status in ('pending','approved','skipped','sent','bounced','responded')),
  skip_reason                 text,                -- 'po_box' | 'llc_owner' | 'bad_address' | …
  agent_id                    uuid,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_farm_targets_sold
  on public.farm_targets (sold_listing_id);

create index if not exists idx_farm_targets_agent_status_created
  on public.farm_targets (agent_id, status, created_at desc)
  where agent_id is not null;

create unique index if not exists idx_farm_targets_qr_token
  on public.farm_targets (qr_token)
  where qr_token is not null;

alter table public.farm_targets enable row level security;

-- ── farm_outreach ──────────────────────────────────────────────────────────
-- Append-only send log. One row per send attempt per target (so multi-channel
-- and resend tries are individually accountable). response_lead_id closes the
-- loop when a visitor identifies via /api/lead carrying the matching token.

create table if not exists public.farm_outreach (
  id                  uuid primary key default uuid_generate_v4(),
  farm_target_id      uuid not null references public.farm_targets(id) on delete cascade,
  channel             text not null check (channel in ('postcard','email','sms')),
  provider            text not null,              -- 'lob' | 'postgrid' | 'resend' | …
  provider_id         text,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  status              text not null default 'queued',
  cost_cents          integer,
  response_lead_id    uuid references public.funnel_leads(id) on delete set null,
  agent_id            uuid,
  created_at          timestamptz not null default now()
);

create index if not exists idx_farm_outreach_target
  on public.farm_outreach (farm_target_id);

create index if not exists idx_farm_outreach_agent_status_created
  on public.farm_outreach (agent_id, status, created_at desc)
  where agent_id is not null;

create index if not exists idx_farm_outreach_response_lead
  on public.farm_outreach (response_lead_id)
  where response_lead_id is not null;

alter table public.farm_outreach enable row level security;
