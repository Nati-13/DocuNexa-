-- ==============================================================================
-- DocuNexa Migration: Durable Server-Managed Legal Acceptances Audit Record
-- Migration: 20261104145935_create_legal_acceptances.sql
-- ==============================================================================

-- 1. Create legal_acceptances table
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null default '2026.11',
  privacy_version text not null default '2026.11',
  policy_scope text not null default 'all_terms_and_privacy',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2. Indexes for fast user lookup and audit chronology
create index if not exists idx_legal_acceptances_user_id on public.legal_acceptances(user_id);
create index if not exists idx_legal_acceptances_accepted_at on public.legal_acceptances(accepted_at desc);

-- 3. Enable Row Level Security (RLS)
alter table public.legal_acceptances enable row level security;

-- 4. RLS Policies
-- Authenticated users can view their own acceptance history (read-only)
drop policy if exists "Users can view own legal acceptances" on public.legal_acceptances;
create policy "Users can view own legal acceptances"
  on public.legal_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Prohibit direct client-side insert, update, delete, or truncate:
-- Explicitly revoke ALL table privileges from PUBLIC, anon, and authenticated.
revoke all on public.legal_acceptances from public;
revoke all on public.legal_acceptances from anon;
revoke all on public.legal_acceptances from authenticated;

-- Grant only SELECT to authenticated users (subject to RLS filter auth.uid() = user_id)
grant select on public.legal_acceptances to authenticated;

-- Grant required management privileges to service_role (trusted backend operations)
grant all on public.legal_acceptances to service_role;

