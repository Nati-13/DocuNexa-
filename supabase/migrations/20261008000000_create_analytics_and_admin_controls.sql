-- ==============================================================================
-- DocuNexa Migration: Analytics Events & Admin Controls
-- ==============================================================================

-- 1. Create Privacy-Preserving Analytics Events Table
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('pageview', 'signup', 'login')),
  path text not null,
  country_code text, -- 2-letter ISO country code or null if unknown
  visitor_id_hash text not null, -- Daily salted hash of client identifier; raw IP is NEVER stored
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Add is_suspended to profiles table if not present
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- 3. Indexes for Analytics Queries & Performance
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
create index if not exists idx_analytics_events_type_created on public.analytics_events(event_type, created_at);
create index if not exists idx_analytics_events_country on public.analytics_events(country_code);
create index if not exists idx_analytics_events_path on public.analytics_events(path);
create index if not exists idx_profiles_is_suspended on public.profiles(is_suspended);

-- 4. Enable Row Level Security (RLS)
alter table public.analytics_events enable row level security;

-- 5. RLS Policies
-- Service role has full control. Regular clients cannot directly query raw analytics events.
drop policy if exists "Service role manages analytics events" on public.analytics_events;
create policy "Service role manages analytics events"
  on public.analytics_events for all
  to service_role
  using (true)
  with check (true);
