-- Phase 2: lead-management columns on funnel_leads.
-- Adds status pipeline, free-form notes, AI-drafted first reply,
-- and an agent_id seam for future multi-tenancy.

alter table public.funnel_leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'working', 'won', 'lost')),
  add column if not exists notes text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists ai_draft text,
  add column if not exists ai_draft_model text,
  add column if not exists ai_draft_generated_at timestamptz,
  add column if not exists agent_id uuid;

-- Inbox query path: filter by status + recency.
create index if not exists idx_funnel_leads_status_created
  on public.funnel_leads (status, created_at desc);

-- Multi-tenant ready: scope-by-agent_id queries will use this.
create index if not exists idx_funnel_leads_agent_status
  on public.funnel_leads (agent_id, status, created_at desc)
  where agent_id is not null;

-- Bump status_changed_at whenever status changes (drives reporting on
-- time-in-stage and lets n8n flows fire on stage transitions).
create or replace function public.bump_status_changed_at()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_funnel_leads_status_changed on public.funnel_leads;
create trigger trg_funnel_leads_status_changed
  before update on public.funnel_leads
  for each row execute function public.bump_status_changed_at();
