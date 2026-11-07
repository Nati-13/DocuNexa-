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
  if v_clean_email is null or v_clean_email = '' then
    raise exception 'Invalid customer email';
  end if;
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
  if v_clean_email is null or v_clean_email = '' then
    raise exception 'Invalid customer email';
  end if;
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

-- 3. Create atomic function for administrator account unlock & audit
-- Transactionally updates account_login_attempts AND inserts an audit record into admin_audit_logs.
-- Commits ONLY when both succeed; rolls back the unlock if audit log insertion fails.
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
  v_admin_uuid uuid;
  v_rows_updated integer;
begin
  -- 1. Validate the requested email and administrator identity
  v_clean_email := lower(trim(p_email));
  if v_clean_email is null or v_clean_email = '' then
    raise exception 'Invalid customer email';
  end if;

  if p_admin_user_id is null or trim(p_admin_user_id) = '' then
    raise exception 'Invalid administrator ID';
  end if;

  begin
    v_admin_uuid := p_admin_user_id::uuid;
  exception when others then
    raise exception 'Administrator ID must be a valid UUID: %', p_admin_user_id;
  end;

  v_now := timezone('utc'::text, now());

  -- 2. Update the intended existing account record
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

  -- 3. Verify that the intended record was actually updated
  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'No login attempts record found for %', v_clean_email;
  end if;

  -- 4. Insert the account_unlocked_by_admin audit record into public.admin_audit_logs
  -- Action column is text; admin_user_id has foreign key constraint to auth.users(id)
  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    reason,
    metadata,
    created_at
  )
  values (
    v_admin_uuid,
    'account_unlocked_by_admin',
    coalesce(p_reason, 'Admin manual account unlock'),
    jsonb_build_object(
      'unlockedEmail', v_clean_email,
      'timestamp', v_now
    ),
    v_now
  );

  -- 5, 6, 7. In PL/pgSQL, this entire block runs in a single PostgreSQL transaction.
  -- If either the update verification or the audit log insertion raises an exception,
  -- the entire transaction rolls back automatically.
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
