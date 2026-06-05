-- 0006_niche_pages.sql — DB-driven niche landing pages for paid traffic.
--
-- Each row defines a /search/[slug] landing page targeted at a specific
-- keyword theme (e.g. "germantown-homes-under-400k", "cedarburg-home-value").
-- intent drives the CTA: buy → SearchGate modal, sell → /home-value funnel.
-- Pages are SSG'd; toggling active=false unpublishes without deleting state.

create table if not exists public.niche_pages (
  slug          text primary key,
  title         text not null,
  h1            text not null,
  intent        text not null check (intent in ('buy', 'sell')),
  geo           text,
  filters       jsonb,
  hero_copy     text,
  og_image      text,
  meta_desc     text,
  active        boolean not null default true,
  agent_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_niche_pages_active_created
  on public.niche_pages (active, created_at desc);

create index if not exists idx_niche_pages_agent
  on public.niche_pages (agent_id, created_at desc)
  where agent_id is not null;

create or replace function public.set_niche_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_niche_pages_updated_at on public.niche_pages;
create trigger trg_niche_pages_updated_at
  before update on public.niche_pages
  for each row execute function public.set_niche_pages_updated_at();

alter table public.niche_pages enable row level security;
