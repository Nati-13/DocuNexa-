-- ==============================================================================
-- DocuNexa Supabase Migration: Add TRON TRC20 and Polygon Native USDC Payment Support
-- ==============================================================================

-- 1. Update network column constraint on payment_orders to allow 'TRON' alongside 'Polygon' and 'Aptos'
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payment_orders_network_check'
  ) then
    alter table public.payment_orders
      drop constraint payment_orders_network_check;
  end if;

  alter table public.payment_orders
    add constraint payment_orders_network_check
    check (network in ('Polygon', 'Aptos', 'TRON'));
end $$;

-- 2. Update currency column constraint on payment_orders to allow 'USDT' and 'USDC'
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payment_orders_currency_check'
  ) then
    alter table public.payment_orders
      drop constraint payment_orders_currency_check;
  end if;

  alter table public.payment_orders
    add constraint payment_orders_currency_check
    check (currency in ('USDT', 'USDC'));
end $$;

-- 3. Composite index on network, currency and status for high-speed payment matching
create index if not exists idx_payment_orders_network_currency_status
  on public.payment_orders (network, currency, status);

