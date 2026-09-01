-- Skela — full database schema. Run this once on a brand-new Supabase project to set up
-- everything the plugin and its Edge Functions need. Safe to re-run any time (every statement
-- is idempotent) — as new features need new tables/columns, add them here instead of a new
-- standalone schema-*.sql file, so there's always exactly one script to run.
--
-- NOT included: schema-components-preview-fix.sql — that was a one-time content fix for a
-- specific set of hand-seeded demo rows (hero, navbar, pricing-card, ...) from this project's
-- own dev history, not part of a fresh setup.

-- ============================================================================
-- components — the catalog
-- ============================================================================

create table if not exists components (
  id text primary key,
  name text not null,
  category text not null,
  is_pro boolean not null default false,
  preview_svg text,
  tsx_source text,
  file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table components enable row level security;

do $$ begin
  create policy "Authenticated users can read components"
    on components for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

-- Lets a row be sourced from a real Framer-designed component (a Module URL synced from a
-- Framer project) instead of hand-written tsx_source. Both kinds of components live in the
-- same table; the client branches on which fields are present.
alter table components add column if not exists module_url text;

-- Distinguishes "tier/category came from the last sync" from "an admin explicitly set this in
-- Edit Components" — without this, freezing fields after first insert (to protect manual
-- corrections) would also freeze them against legitimate signal changes from Framer, like
-- renaming a component to add a "pro-" prefix.
alter table components add column if not exists tier_manually_set boolean not null default false;

-- Real raster preview images (screenshots), separate from preview_svg (hand-drawn/vector only).
-- Rendering preference everywhere: preview_image_url > preview_svg > category-icon fallback.
alter table components add column if not exists preview_image_url text;

-- Pro components' tsx_source must not be downloadable by free users just by listing the
-- catalog. This closes that at the DB level too — the only way to get a Pro component's
-- source is the get-component-source Edge Function, which checks profiles.is_pro with the
-- service role before returning it.
revoke select (tsx_source) on components from anon, authenticated;

-- Public-read bucket — preview images need to load in the plugin UI without auth. Writes only
-- ever happen via the upload-component-preview Edge Function's service role, gated to
-- ADMIN_EMAILS; no bucket policy grants direct client write access. allowed_mime_types /
-- file_size_limit enforce the same image-only, 500KB-max rule at the storage layer itself, as a
-- second line of defense alongside the Edge Function's own check.
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('component-previews', 'component-previews', true, array['image/*'], 512000)
on conflict (id) do update set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

-- ============================================================================
-- profiles — per-user account data
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  onboarding_answers jsonb,
  full_name text,
  is_pro boolean not null default false,
  polar_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

do $$ begin
  create policy "Users can read their own profile"
    on profiles for select
    to authenticated
    using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert their own profile"
    on profiles for insert
    to authenticated
    with check (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update their own profile"
    on profiles for update
    to authenticated
    using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- The "update their own profile" policy above only checks auth.uid() = id — that alone would
-- let a signed-in user set is_pro = true on themselves via a normal client update call.
-- Restrict which columns authenticated users can actually write; is_pro and polar_customer_id
-- are only ever touched by the Polar webhook function using the service role key, which
-- bypasses RLS/grants entirely.
revoke update on profiles from authenticated;
grant update (full_name, onboarding_completed, onboarding_answers, updated_at) on profiles to authenticated;

-- Auto-create a profile row the moment a new user signs up, so the app never has to worry
-- about "does this user have a profile yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- boards + saved_items — user-organized collections of saved components
-- ============================================================================

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table boards enable row level security;

do $$ begin
  create policy "Users manage their own boards"
    on boards for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- board_id null = unsorted, but still counts as "saved" — every row here shows up in the
-- "All saved" view regardless of whether it's also organized into a board.
create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  component_id text not null references components(id) on delete cascade,
  board_id uuid references boards(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, component_id, board_id)
);

alter table saved_items enable row level security;

do $$ begin
  create policy "Users manage their own saved items"
    on saved_items for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- palettes — user-saved color palettes for the Colors tool
-- ============================================================================

create table if not exists palettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  colors jsonb not null,
  created_at timestamptz not null default now()
);

alter table palettes enable row level security;

do $$ begin
  create policy "Users can read their own palettes"
    on palettes for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert their own palettes"
    on palettes for insert
    to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete their own palettes"
    on palettes for delete
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- oauth_relay — short-lived, single-use handoff for Google OAuth tokens between the callback
-- tab and the plugin iframe (see supabase/functions/oauth-relay/index.ts)
-- ============================================================================

create table if not exists oauth_relay (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  created_at timestamptz not null default now()
);

alter table oauth_relay enable row level security;
-- No policies: RLS with zero policies denies all client access by default, which is exactly
-- what we want — this table is a service-role-only mailbox.

-- ============================================================================
-- sync_allowed_projects — admin-managed allowlist of Framer project ids that
-- "Sync from this project" is allowed to run from (see Settings → Admin)
-- ============================================================================

create table if not exists sync_allowed_projects (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);
