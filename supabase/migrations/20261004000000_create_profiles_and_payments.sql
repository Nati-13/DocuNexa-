-- ==============================================================================
-- DocuNexa Supabase Schema: Profiles, Bybit Payment Orders & RLS Entitlements
-- ==============================================================================

-- 1. Create Profiles Table (1-to-1 extension of auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'ad_free')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Create Payment Orders Table (Bybit Direct USDT Polygon PoS)
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id text not null unique,
  product text not null default 'ad_free',
  base_amount_usd numeric(10, 2) not null default 2.00,
  payment_amount_usdt numeric(18, 6) not null,
  currency text not null default 'USDT',
  network text not null default 'Polygon',
  destination_address text not null,
  status text not null default 'pending' check (status in ('pending', 'detected', 'confirmed', 'expired', 'amount_mismatch', 'late_payment', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  detected_at timestamptz,
  confirmed_at timestamptz,
  bybit_deposit_id text unique,
  tx_id text,
  block_hash text,
  confirmations integer,
  received_amount numeric(18, 6),
  failure_reason text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Indexes for fast lookups & collision prevention
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_payment_orders_user_id on public.payment_orders(user_id);
create index if not exists idx_payment_orders_order_id on public.payment_orders(order_id);
create index if not exists idx_payment_orders_amount_status on public.payment_orders(payment_amount_usdt, status);
create index if not exists idx_payment_orders_bybit_deposit_id on public.payment_orders(bybit_deposit_id);
create index if not exists idx_payment_orders_expires_at on public.payment_orders(expires_at);

-- Partial unique index: Guarantee no two active orders share the same payment amount
create unique index if not exists idx_unique_active_payment_amount 
  on public.payment_orders (payment_amount_usdt) 
  where status in ('pending', 'detected');

-- 4. Automatic Profile Provisioning Trigger on User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, coalesce(new.email, ''), 'free')
  on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.payment_orders enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Service role can manage profiles" on public.profiles;
drop policy if exists "Users can view own payment orders" on public.payment_orders;
drop policy if exists "Service role can manage payment orders" on public.payment_orders;

-- Profiles: Authenticated users can view only their own profile
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Profiles: Only service role can modify profiles (specifically plan column)
create policy "Service role can manage profiles"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- Payment Orders: Authenticated users can view only their own orders
create policy "Users can view own payment orders"
  on public.payment_orders for select
  to authenticated
  using (auth.uid() = user_id);

-- Payment Orders: Only service role can insert or update orders (via server actions/check endpoints)
create policy "Service role can manage payment orders"
  on public.payment_orders for all
  to service_role
  using (true)
  with check (true);
