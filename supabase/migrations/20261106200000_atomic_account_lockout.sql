-- ==============================================================================
-- DocuNexa Migration: Atomic Account Lockout & Admin Recovery Functions
-- Migration: 20261106200000_atomic_account_lockout.sql
-- ==============================================================================

-- 1. Create atomic function to record failed login attempts
-- Uses SECURITY DEFINER with explicit search_path = public to prevent privilege escalation.
-- Concurrency safe: uses ON CONFLICT DO UPDATE SET failed_attempts = account_login_attempts.failed_attempts + 1.
create or replace function public.record_failed_login_attempt(
  p_email text,
  p_ip text default '127.0.0.1',
  p_max_attempts integer default 5
)
returns table (
  email text,
  failed_attempts integer,
  is_locked boolean,
  locked_at timestamptz,
  locked_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_email text;
  v_now timestamptz;
  v_reason text := 'Exceeded maximum 5 consecutive failed login attempts';
begin
  v_clean_email := lower(trim(p_email));
  v_now := timezone('utc'::text, now());

  return query
  insert into public.account_login_attempts (
    email,
    failed_attempts,
    last_failed_at,
    is_locked,
    locked_at,
    locked_reason,
    last_ip,
    updated_at
  )
  values (
    v_clean_email,
    1,
    v_now,
    (1 >= p_max_attempts),
    case when 1 >= p_max_attempts then v_now else null end,
    case when 1 >= p_max_attempts then v_reason else null end,
    p_ip,
    v_now
  )
  on conflict (email) do update set
    failed_attempts = public.account_login_attempts.failed_attempts + 1,
    last_failed_at = v_now,
    is_locked = (public.account_login_attempts.failed_attempts + 1 >= p_max_attempts) or public.account_login_attempts.is_locked,
    locked_at = case
      when (public.account_login_attempts.failed_attempts + 1 >= p_max_attempts) and public.account_login_attempts.locked_at is null
      then v_now
      else public.account_login_attempts.locked_at
    end,
    locked_reason = case
      when (public.account_login_attempts.failed_attempts + 1 >= p_max_attempts)
      then v_reason
      else public.account_login_attempts.locked_reason
    end,
    last_ip = p_ip,
    updated_at = v_now
  returning
    public.account_login_attempts.email,
    public.account_login_attempts.failed_attempts,
    public.account_login_attempts.is_locked,
    public.account_login_attempts.locked_at,
    public.account_login_attempts.locked_reason;
end;
$$;

-- 2. Create atomic function to reset login attempts on verified successful password login
create or replace function public.record_successful_login(
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_email text;
  v_now timestamptz;
begin
  v_clean_email := lower(trim(p_email));
  v_now := timezone('utc'::text, now());

  update public.account_login_attempts
  set
    failed_attempts = 0,
    is_locked = false,
    locked_at = null,
    locked_reason = null,
    unlocked_at = v_now,
    updated_at = v_now
  where email = v_clean_email;

  return true;
end;
$$;

-- 3. Create atomic function for administrator account unlock
create or replace function public.admin_unlock_account(
  p_email text,
  p_admin_user_id text,
  p_reason text default 'Admin manual account unlock'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_email text;
  v_now timestamptz;
begin
  v_clean_email := lower(trim(p_email));
  v_now := timezone('utc'::text, now());

  update public.account_login_attempts
  set
    failed_attempts = 0,
    is_locked = false,
    locked_at = null,
    locked_reason = null,
    unlocked_at = v_now,
    unlocked_by = p_admin_user_id,
    updated_at = v_now
  where email = v_clean_email;

  return true;
end;
$$;

-- 4. Secure privileges: revoke from PUBLIC, anon, authenticated; grant strictly to service_role
revoke all on function public.record_failed_login_attempt(text, text, integer) from public, anon, authenticated;
grant execute on function public.record_failed_login_attempt(text, text, integer) to service_role;

revoke all on function public.record_successful_login(text) from public, anon, authenticated;
grant execute on function public.record_successful_login(text) to service_role;

revoke all on function public.admin_unlock_account(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_unlock_account(text, text, text) to service_role;
