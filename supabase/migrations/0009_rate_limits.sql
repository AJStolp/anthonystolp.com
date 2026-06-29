-- 0009_rate_limits.sql — cross-instance fixed-window rate limiter.
--
-- Serverless instances don't share memory, so the in-memory limiter in
-- bot-defense.ts can be bypassed by hitting different cold instances. This
-- table + function give every instance a single shared counter, keyed by
-- `${ip}:${endpoint}` and bucketed into fixed time windows. bot-defense.ts
-- calls increment_rate_limit() and falls back to the in-memory window when
-- Supabase is unconfigured or the RPC errors.

create table if not exists public.rate_limits (
  key           text not null,
  window_start  bigint not null,   -- unix-epoch seconds, floored to the window boundary
  count         integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

-- Atomic fixed-window increment. Buckets `now()` into a window of
-- p_window_seconds, bumps the counter for (p_key, window) in a single
-- upsert, and returns true while the bucket is at or below p_max (allowed),
-- false once it exceeds it. The upsert is race-free under concurrency.
--
-- Stale windows for the same key are pruned opportunistically on each call,
-- so an active key never accumulates more than one live row. Abandoned keys
-- (IPs that never return) can be swept periodically with:
--   delete from public.rate_limits where window_start < <cutoff>;
create or replace function public.increment_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max int
)
returns boolean
language plpgsql
as $$
declare
  v_window_start bigint;
  v_count        int;
begin
  v_window_start := (extract(epoch from now())::bigint / p_window_seconds) * p_window_seconds;

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Drop this key's expired windows so the table stays at ~1 row per active key.
  delete from public.rate_limits
  where key = p_key and window_start < v_window_start;

  return v_count <= p_max;
end;
$$;
