-- ==============================================================================
-- DocuNexa Migration: Distributed Rate Limiting & Abuse Defense
-- Migration: 20261006000001_security_rate_limits.sql
-- ==============================================================================

-- 1. Create table for serverless-safe rate limiting
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

-- Index on reset_at for periodic cleanup
create index if not exists idx_rate_limits_reset_at on public.rate_limits(reset_at);

-- 2. Lockdown Row Level Security (RLS) on rate_limits: service_role only
alter table public.rate_limits enable row level security;

drop policy if exists "Service role can manage rate_limits" on public.rate_limits;
create policy "Service role can manage rate_limits"
  on public.rate_limits for all
  to service_role
  using (true)
  with check (true);

-- 3. Atomic rate-checking function with hardened search_path
create or replace function public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := timezone('utc'::text, now());
  v_record record;
begin
  select * into v_record from public.rate_limits where key = p_key for update;

  if not found or v_record.reset_at < v_now then
    insert into public.rate_limits (key, count, reset_at)
    values (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
    on conflict (key) do update
    set count = 1,
        reset_at = excluded.reset_at;
    return true;
  end if;

  if v_record.count >= p_max_requests then
    return false;
  end if;

  update public.rate_limits
  set count = count + 1
  where key = p_key;

  return true;
end;
$$;

-- Revoke public execution; available strictly to service_role
revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
