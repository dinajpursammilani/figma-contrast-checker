-- Components catalog table. Run this once, then run seed-components.sql to populate it.

create table if not exists components (
  id text primary key,
  name text not null,
  category text not null,
  is_pro boolean not null default false,
  preview_svg text not null,
  tsx_source text not null,
  file_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table components enable row level security;

-- Read-only catalog data: any authenticated user of the plugin can see the full list
-- (free vs pro is just a flag the client checks before letting them insert it — actual
-- gating happens at insert-time once the payment/entitlement system exists).
create policy "Authenticated users can read components"
  on components for select
  to authenticated
  using (true);
