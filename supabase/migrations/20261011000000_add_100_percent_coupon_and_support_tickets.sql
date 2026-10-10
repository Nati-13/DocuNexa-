-- ==============================================================================
-- DocuNexa Migration: 100% Discount Coupons & Customer Support System
-- ==============================================================================

-- 1. Relax coupon discount bounds check constraint to allow 100% discount
alter table public.coupons drop constraint if exists chk_coupon_discount_bounds;
alter table public.coupons add constraint chk_coupon_discount_bounds check (
  (discount_type = 'percent' and discount_value > 0 and discount_value <= 100) or
  (discount_type = 'fixed_usdt' and discount_value > 0 and discount_value <= 2.00)
);

-- 2. Idempotent initial configuration of DOCUNEXA100WELL coupon
insert into public.coupons (
  code,
  discount_type,
  discount_value,
  active,
  max_redemptions,
  max_redemptions_per_user
) values (
  'DOCUNEXA100WELL',
  'percent',
  100,
  true,
  null,
  1
) on conflict (code) do update set
  discount_type = 'percent',
  discount_value = 100,
  active = true;

-- 3. Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  category text not null check (category in ('Account', 'Payments', 'PDF Tools', 'Coupon', 'Bug Report', 'Other')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create Indexes for Support Tickets
create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at);
create index if not exists idx_support_tickets_category on public.support_tickets(category);

-- 5. Enable Row Level Security (RLS) for Support Tickets
alter table public.support_tickets enable row level security;

-- 6. Support Tickets RLS Policies
-- Authenticated users can view their own tickets
drop policy if exists "Users can view own support tickets" on public.support_tickets;
create policy "Users can view own support tickets"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id);

-- Service role has full access (read, write, update, delete)
drop policy if exists "Service role manages support tickets" on public.support_tickets;
create policy "Service role manages support tickets"
  on public.support_tickets for all
  to service_role
  using (true)
  with check (true);

-- 7. Create Telegram Support Mapping Table
create table if not exists public.telegram_support_mappings (
  owner_message_id text primary key,
  customer_chat_id text not null,
  customer_message_id text,
  customer_user_id text,
  customer_name text,
  ticket_ref text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_tg_mappings_ticket_ref on public.telegram_support_mappings(ticket_ref);

alter table public.telegram_support_mappings enable row level security;
drop policy if exists "Service role manages tg mappings" on public.telegram_support_mappings;
create policy "Service role manages tg mappings"
  on public.telegram_support_mappings for all
  to service_role
  using (true)
  with check (true);

-- 8. Create Telegram Processed Updates Table (Idempotency)
create table if not exists public.telegram_processed_updates (
  update_id text primary key,
  processed_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.telegram_processed_updates enable row level security;
drop policy if exists "Service role manages tg updates" on public.telegram_processed_updates;
create policy "Service role manages tg updates"
  on public.telegram_processed_updates for all
  to service_role
  using (true)
  with check (true);

-- 9. Atomic Zero-Cost Coupon Redemption Procedure
create or replace function public.redeem_zero_cost_coupon_atomic(
  p_user_id uuid,
  p_coupon_id uuid,
  p_order_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_coupon record;
  v_user_plan text;
  v_user_redemptions integer;
  v_payment_order_id uuid;
begin
  -- 1. Lock coupon row for concurrency safety
  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Coupon not found in database.');
  end if;

  -- 2. Verify active status
  if not v_coupon.active then
    return jsonb_build_object('success', false, 'error', 'This coupon is currently inactive.');
  end if;

  -- 3. Verify date validity
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return jsonb_build_object('success', false, 'error', 'This coupon is not yet active.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'This coupon has expired.');
  end if;

  -- 4. Verify global redemption limit
  if v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions then
    return jsonb_build_object('success', false, 'error', 'This coupon has reached its maximum global redemptions.');
  end if;

  -- 5. Verify per-user redemption limit
  select count(*) into v_user_redemptions
  from public.coupon_redemptions
  where coupon_id = p_coupon_id and user_id = p_user_id;

  if v_user_redemptions >= v_coupon.max_redemptions_per_user then
    return jsonb_build_object('success', false, 'error', 'You have already redeemed this coupon.');
  end if;

  -- 6. Check user plan
  select plan into v_user_plan from public.profiles where id = p_user_id;
  if v_user_plan = 'ad_free' then
    return jsonb_build_object('success', true, 'already_paid', true, 'message', 'Your account is already Ad-Free.');
  end if;

  -- 7. Insert confirmed zero-cost order
  insert into public.payment_orders (
    order_id, user_id, payment_amount_usdt, received_amount, base_amount_usd,
    currency, network, destination_address, status, coupon_id, coupon_code,
    discount_type, discount_amount_usdt, original_amount_usd, final_amount_usdt,
    confirmed_at, expires_at, created_at, updated_at
  ) values (
    p_order_id, p_user_id, 0.000000, 0.000000, 2.00,
    'USDT', 'Polygon', '0x0000000000000000000000000000000000000000', 'confirmed',
    v_coupon.id, v_coupon.code, v_coupon.discount_type, 2.000000, 2.000000, 0.000000,
    now(), now() + interval '30 days', now(), now()
  ) returning id into v_payment_order_id;

  -- 8. Record coupon redemption
  insert into public.coupon_redemptions (
    coupon_id, user_id, payment_order_id, discount_amount_usdt, redeemed_at
  ) values (
    v_coupon.id, p_user_id, v_payment_order_id, 2.000000, now()
  );

  -- 9. Increment coupon redemption count
  update public.coupons
  set redemption_count = redemption_count + 1, updated_at = now()
  where id = v_coupon.id;

  -- 10. Upgrade user plan
  update public.profiles
  set plan = 'ad_free', updated_at = now()
  where id = p_user_id;

  -- 11. Cancel lingering pending orders
  update public.payment_orders
  set status = 'cancelled', updated_at = now()
  where user_id = p_user_id and status in ('pending', 'detected');

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_order_id', v_payment_order_id);
end;
$$;
