-- Boards: user-created collections for organizing saved components.
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table boards enable row level security;

create policy "Users manage their own boards"
  on boards for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Saved items: a saved component, optionally filed into a board. board_id null = unsorted,
-- but still counts as "saved" — every row here shows up in the "All saved" view regardless
-- of whether it's also organized into a board.
create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  component_id text not null references components(id) on delete cascade,
  board_id uuid references boards(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, component_id, board_id)
);

alter table saved_items enable row level security;

create policy "Users manage their own saved items"
  on saved_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
