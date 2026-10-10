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
