-- User-saved color palettes for the Colors tool.
create table if not exists palettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  colors jsonb not null,
  created_at timestamptz not null default now()
);

alter table palettes enable row level security;

create policy "Users can read their own palettes"
  on palettes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own palettes"
  on palettes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own palettes"
  on palettes for delete
  to authenticated
  using (auth.uid() = user_id);
