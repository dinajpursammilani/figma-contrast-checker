-- Distinguishes "tier/category came from the last sync" from "an admin explicitly set this in
-- Edit Components" — without this, freezing fields after first insert (to protect manual
-- corrections) also freezes them against legitimate signal changes from Framer, like renaming a
-- component to add a "pro/" prefix or moving it to a different page.
alter table components add column if not exists tier_manually_set boolean not null default false;
