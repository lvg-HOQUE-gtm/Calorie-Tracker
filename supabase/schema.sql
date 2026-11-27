-- Ahaar AI database schema.
--
-- Run this once against your Supabase project (SQL Editor, or via the
-- Supabase MCP `apply_migration` tool). Photos are never stored here --
-- see src/lib/photos.ts for why they stay on-device -- so this table only
-- ever holds a few hundred bytes per log.

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_name text not null,
  bengali_name text,
  calories integer not null default 0,
  protein_g integer not null default 0,
  carbs_g integer not null default 0,
  fat_g integer not null default 0,
  fiber_g integer not null default 0,
  serving_description text,
  confidence real,
  items jsonb not null default '[]'::jsonb,
  -- On-device file:// path to the meal photo. Intentionally NOT a Supabase
  -- Storage URL: photos are resized to ~50-90KB and kept locally, never
  -- uploaded, to avoid burning the free storage/egress tiers on decorative
  -- thumbnails that have no value once Gemini has already extracted macros.
  image_uri text,
  -- Reserved for an optional future "back up my photos to the cloud"
  -- feature. Unused today; keeping the column now means turning that
  -- feature on later needs no migration.
  image_path text,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Every list view (today's feed, history) queries "this user's logs, newest
-- first, optionally within a date range" -- this index serves all of them
-- without a sequential scan as log volume grows.
create index if not exists food_logs_user_logged_at_idx
  on public.food_logs (user_id, logged_at desc);

alter table public.food_logs enable row level security;

-- Anonymous sign-ins use the same `authenticated` Postgres role as
-- permanent users, so these policies apply identically to guest scans and
-- to fully signed-up accounts -- exactly what lets a guest save a log
-- before they ever see the auth gate.
drop policy if exists "food_logs_select_own" on public.food_logs;
create policy "food_logs_select_own"
  on public.food_logs for select
  using (auth.uid() = user_id);

drop policy if exists "food_logs_insert_own" on public.food_logs;
create policy "food_logs_insert_own"
  on public.food_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "food_logs_update_own" on public.food_logs;
create policy "food_logs_update_own"
  on public.food_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "food_logs_delete_own" on public.food_logs;
create policy "food_logs_delete_own"
  on public.food_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Rate limiting for the analyze-meal Edge Function.
--
-- Each Gemini call costs money, and the app hands an anonymous JWT to anyone
-- who opens it, so without a per-user cap a single client looping the scan
-- endpoint could drain the whole Gemini quota. The Edge Function records one
-- row here per analysis attempt and refuses the request when a user exceeds
-- the hourly/daily allowance.
-- ---------------------------------------------------------------------------

create table if not exists public.scan_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists scan_usage_user_created_at_idx
  on public.scan_usage (user_id, created_at desc);

-- RLS on with no policies: clients can never read or write this table
-- directly. Only the Edge Function's service-role key can touch it.
alter table public.scan_usage enable row level security;

-- ---------------------------------------------------------------------------
-- Per-user nutrition profile (calorie target today; macros stay app defaults).
-- One row per auth user. Deleted with the account (ON DELETE CASCADE).
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  calorie_target integer not null default 2200,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
