-- ==============================================================================
-- DocuNexa Supabase Migration: Add Aptos USDT Mainnet Payment Support
-- ==============================================================================

-- 1. Ensure network column accepts strictly 'Polygon' and 'Aptos'
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_orders_network_check'
  ) then
    alter table public.payment_orders
      add constraint payment_orders_network_check
      check (network in ('Polygon', 'Aptos'));
  end if;
end $$;

-- 2. Index on network and status for admin query performance & status filters
create index if not exists idx_payment_orders_network_status
  on public.payment_orders (network, status);

-- 3. Document official Aptos USDT metadata ID and contract rules
comment on column public.payment_orders.network is 
  'Blockchain network used for payment: Polygon (Bybit USDT PoS) or Aptos (Tether USDt Fungible Asset 0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b)';
