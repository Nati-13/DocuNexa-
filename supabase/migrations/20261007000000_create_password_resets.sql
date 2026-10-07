-- ==============================================================================
-- DocuNexa Migration: Password Reset Requests & Recovery Code Vault
-- Migration: 20261007000000_create_password_resets.sql
-- ==============================================================================

-- 1. Create table for cryptographic password reset requests
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  request_ip_hash text,
  verification_token_hash text
);

-- 2. Indexes for fast lookup and expiration checks
create index if not exists idx_password_resets_email_used on public.password_resets(email, used_at, expires_at);
create index if not exists idx_password_resets_user_id on public.password_resets(user_id);
create index if not exists idx_password_resets_expires_at on public.password_resets(expires_at);

-- 3. Row Level Security: Completely restricted to service_role (server-only access)
alter table public.password_resets enable row level security;

drop policy if exists "Service role can manage password_resets" on public.password_resets;
create policy "Service role can manage password_resets"
  on public.password_resets for all
  to service_role
  using (true)
  with check (true);
