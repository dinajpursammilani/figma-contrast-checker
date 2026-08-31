create table if not exists sync_allowed_projects (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);
