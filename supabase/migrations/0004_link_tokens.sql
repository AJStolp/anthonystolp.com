-- 0004_link_tokens.sql — generic offline-to-online attribution primitive.
--
-- Each token is a short random slug that resolves to a target URL plus a
-- context blob. /n/[token] looks it up, drops a tying cookie, fires a
-- tracking event, then 302s the visitor to target_url. Reusable for farm
-- postcards, ads, business cards, open-house signs, anything that needs to
-- bridge an offline touchpoint to an attributable visit on the site.

create table if not exists public.link_tokens (
  token         text primary key,
  target_url    text not null,
  context       jsonb,
  agent_id      uuid,
  expires_at    timestamptz,
  hit_count     integer not null default 0,
  last_hit_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_link_tokens_agent_created
  on public.link_tokens (agent_id, created_at desc)
  where agent_id is not null;

alter table public.link_tokens enable row level security;

-- Atomic per-row counter bump. Avoids a read-modify-write race when many
-- visitors hit the same token concurrently (e.g. a postcard QR going viral).
create or replace function public.bump_link_token_hit(p_token text)
returns void
language plpgsql
as $$
begin
  update public.link_tokens
  set hit_count = hit_count + 1,
      last_hit_at = now()
  where token = p_token;
end;
$$;
