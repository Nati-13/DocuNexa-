-- ==============================================================================
-- DocuNexa Migration: Harden Security, Search Paths & Optimize RLS Policies
-- Migration: 20261006000000_harden_security_and_rls.sql
-- ==============================================================================

-- 1. Harden handle_new_user() with explicit search_path and restricted permissions
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, coalesce(new.email, ''), 'free')
  on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Revoke public/anon/authenticated execution of handle_new_user trigger function
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to service_role;

-- 2. Harden confirm_payment_order() with explicit search_path and restricted permissions
create or replace function public.confirm_payment_order(
  p_order_id text,
  p_bybit_deposit_id text,
  p_tx_id text,
  p_block_hash text default null,
  p_confirmations integer default null,
  p_received_amount numeric(18, 6) default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_coupon record;
  v_user_redemptions_count integer;
  v_now timestamptz := timezone('utc'::text, now());
begin
  -- 1. Select and lock the payment order
  select * into v_order
  from public.payment_orders
  where order_id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Payment order not found');
  end if;

  if v_order.status = 'confirmed' then
    return jsonb_build_object('success', true, 'already_confirmed', true);
  end if;

  -- 2. Process coupon redemption if attached to order
  if v_order.coupon_id is not null then
    select * into v_coupon
    from public.coupons
    where id = v_order.coupon_id
    for update;

    if found then
      -- Verify max redemptions limit if set
      if v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions then
        return jsonb_build_object('success', false, 'error', 'Coupon maximum redemptions reached');
      end if;

      -- Verify per-user redemption limit
      select count(*) into v_user_redemptions_count
      from public.coupon_redemptions
      where coupon_id = v_order.coupon_id and user_id = v_order.user_id;

      if v_user_redemptions_count >= v_coupon.max_redemptions_per_user then
        return jsonb_build_object('success', false, 'error', 'User maximum redemptions reached for this coupon');
      end if;

      -- Insert redemption record
      insert into public.coupon_redemptions (
        coupon_id,
        user_id,
        payment_order_id,
        discount_amount_usdt,
        redeemed_at
      )
      values (
        v_order.coupon_id,
        v_order.user_id,
        v_order.id,
        coalesce(v_order.discount_amount_usdt, 0),
        v_now
      )
      on conflict (payment_order_id) do nothing;

      -- Increment coupon redemption count atomically
      update public.coupons
      set redemption_count = redemption_count + 1,
          updated_at = v_now
      where id = v_order.coupon_id;
    end if;
  end if;

  -- 3. Mark payment order confirmed
  update public.payment_orders
  set status = 'confirmed',
      confirmed_at = v_now,
      bybit_deposit_id = p_bybit_deposit_id,
      tx_id = p_tx_id,
      block_hash = p_block_hash,
      confirmations = p_confirmations,
      received_amount = coalesce(p_received_amount, v_order.payment_amount_usdt),
      failure_reason = null,
      updated_at = v_now
  where id = v_order.id;

  -- 4. Elevate profile to ad_free
  update public.profiles
  set plan = 'ad_free',
      updated_at = v_now
  where id = v_order.user_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Revoke public execution of confirm_payment_order; available strictly to service_role
revoke all on function public.confirm_payment_order(text, text, text, text, integer, numeric) from public;
revoke all on function public.confirm_payment_order(text, text, text, text, integer, numeric) from anon;
revoke all on function public.confirm_payment_order(text, text, text, text, integer, numeric) from authenticated;
grant execute on function public.confirm_payment_order(text, text, text, text, integer, numeric) to service_role;

-- 3. Optimize RLS ownership policies with (select auth.uid()) for query caching
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can view own payment orders" on public.payment_orders;
create policy "Users can view own payment orders"
  on public.payment_orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own coupon redemptions" on public.coupon_redemptions;
create policy "Users can view own coupon redemptions"
  on public.coupon_redemptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Foreign-key indexes to guarantee optimal JOIN performance
create index if not exists idx_payment_orders_coupon_id on public.payment_orders(coupon_id);
create index if not exists idx_coupon_redemptions_payment_order_id on public.coupon_redemptions(payment_order_id);
create index if not exists idx_coupons_created_by on public.coupons(created_by);
create index if not exists idx_admin_audit_logs_target_user_id on public.admin_audit_logs(target_user_id);
create index if not exists idx_admin_audit_logs_target_payment_id on public.admin_audit_logs(target_payment_id);
create index if not exists idx_admin_audit_logs_target_coupon_id on public.admin_audit_logs(target_coupon_id);
