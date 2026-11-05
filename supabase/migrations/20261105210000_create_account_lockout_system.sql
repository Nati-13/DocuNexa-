-- ==============================================================================
-- DocuNexa Migration: 5-Attempt Account Lockout & Admin Recovery
-- Migration: 20261105210000_create_account_lockout_system.sql
-- ==============================================================================

-- 1. Create dedicated persistent table for tracking consecutive failed login attempts
create table if not exists public.account_login_attempts (
  email text primary key,
  failed_attempts integer not null default 0,
  last_failed_at timestamptz,
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_reason text default 'Exceeded maximum 5 consecutive failed login attempts',
  unlocked_at timestamptz,
  unlocked_by text,
  last_ip text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Index on is_locked for efficient admin filtering
create index if not exists idx_account_login_attempts_locked
  on public.account_login_attempts(is_locked);

create index if not exists idx_account_login_attempts_updated
  on public.account_login_attempts(updated_at);

-- 2. Lockdown Row Level Security (RLS): service_role only
alter table public.account_login_attempts enable row level security;

drop policy if exists "Service role can manage account_login_attempts" on public.account_login_attempts;
create policy "Service role can manage account_login_attempts"
  on public.account_login_attempts for all
  to service_role
  using (true)
  with check (true);

