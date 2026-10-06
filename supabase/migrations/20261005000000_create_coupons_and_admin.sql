-- ==============================================================================
-- DocuNexa Migration: Coupon Discounts System & Secure Admin Panel
-- ==============================================================================

-- 1. Create Coupons Table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent', 'fixed_usdt')),
  discount_value numeric(18, 6) not null,
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user integer not null default 1 check (max_redemptions_per_user > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint chk_coupon_discount_bounds check (
    (discount_type = 'percent' and discount_value > 0 and discount_value <= 99) or
    (discount_type = 'fixed_usdt' and discount_value > 0 and discount_value < 2.00)
  ),
  constraint chk_coupon_redemptions_ceiling check (
    max_redemptions is null or redemption_count <= max_redemptions
  )
);

-- 2. Extend Payment Orders Table with Coupon Columns
alter table public.payment_orders
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists discount_type text check (discount_type is null or discount_type in ('percent', 'fixed_usdt')),
  add column if not exists discount_amount_usdt numeric(18, 6) not null default 0,
  add column if not exists original_amount_usd numeric(18, 6) not null default 2.00,
  add column if not exists final_amount_usdt numeric(18, 6) not null default 2.00;

-- 3. Create Coupon Redemptions Table
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_order_id uuid not null references public.payment_orders(id) on delete cascade unique,
  discount_amount_usdt numeric(18, 6) not null,
  redeemed_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create Admin Users Table
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. Create Admin Audit Logs Table (Append-Only)
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_payment_id uuid references public.payment_orders(id) on delete set null,
  target_coupon_id uuid references public.coupons(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 6. Indexes for Performance & Search
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_active on public.coupons(active);
create index if not exists idx_coupons_expires_at on public.coupons(expires_at);
create index if not exists idx_coupon_redemptions_coupon_id on public.coupon_redemptions(coupon_id);
create index if not exists idx_coupon_redemptions_user_id on public.coupon_redemptions(user_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at);
create index if not exists idx_admin_audit_logs_admin_user_id on public.admin_audit_logs(admin_user_id);

-- 7. Enable Row Level Security (RLS)
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

-- 8. RLS Policies
-- Coupons: Service role has full control. Regular clients cannot inspect or mutate all coupons directly.
drop policy if exists "Service role manages coupons" on public.coupons;
create policy "Service role manages coupons"
  on public.coupons for all
  to service_role
  using (true)
  with check (true);

-- Coupon Redemptions: Users can only view their own redemptions. Service role has full control.
drop policy if exists "Users can view own coupon redemptions" on public.coupon_redemptions;
create policy "Users can view own coupon redemptions"
  on public.coupon_redemptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages coupon redemptions" on public.coupon_redemptions;
create policy "Service role manages coupon redemptions"
  on public.coupon_redemptions for all
  to service_role
  using (true)
  with check (true);

-- Admin Users: Only service role can query or modify admin status.
drop policy if exists "Service role manages admin users" on public.admin_users;
create policy "Service role manages admin users"
  on public.admin_users for all
  to service_role
  using (true)
  with check (true);

-- Admin Audit Logs: Append-only for service role. Cannot be altered by normal users.
drop policy if exists "Service role manages audit logs" on public.admin_audit_logs;
create policy "Service role manages audit logs"
  on public.admin_audit_logs for all
  to service_role
  using (true)
  with check (true);

-- 9. Atomic Payment Confirmation & Coupon Redemption Procedure
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
