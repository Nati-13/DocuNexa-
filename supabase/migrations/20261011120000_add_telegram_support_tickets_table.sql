-- ==============================================================================
-- DocuNexa Migration: Telegram Support Tickets Outbox and Inbox Storage
-- Migration: 20261011120000_add_telegram_support_tickets_table.sql
-- ==============================================================================

-- 1. Create Dedicated Telegram Support Tickets Table
create table if not exists public.telegram_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_ref text unique not null,
  update_id text,
  customer_chat_id text not null,
  customer_message_id text,
  customer_user_id text,
  customer_name text,
  customer_username text,
  message_text text not null,
  has_media boolean default false,
  media_type text,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'delivered', 'failed', 'resolved')),
  owner_chat_id text,
  owner_message_id text,
  delivery_attempts integer not null default 0,
  last_error text,
  customer_acknowledged boolean default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  delivered_at timestamptz
);

-- 2. Performance & Lookup Indexes
create index if not exists idx_tg_tickets_ref on public.telegram_support_tickets(ticket_ref);
create index if not exists idx_tg_tickets_update_id on public.telegram_support_tickets(update_id);
create index if not exists idx_tg_tickets_status on public.telegram_support_tickets(delivery_status);
create index if not exists idx_tg_tickets_customer on public.telegram_support_tickets(customer_chat_id);
create index if not exists idx_tg_tickets_owner_msg on public.telegram_support_tickets(owner_message_id);

-- 3. Row Level Security (RLS)
alter table public.telegram_support_tickets enable row level security;

drop policy if exists "Service role manages telegram tickets" on public.telegram_support_tickets;
create policy "Service role manages telegram tickets"
  on public.telegram_support_tickets for all
  to service_role
  using (true)
  with check (true);
