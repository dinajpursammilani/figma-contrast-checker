-- Lets a catalog row be sourced from a real Framer-designed component (a Module URL, synced
-- from Dominik's own Framer project) instead of hand-written tsx_source. Both kinds of
-- components live in the same table; the client branches on which fields are present.
alter table components alter column tsx_source drop not null;
alter table components alter column preview_svg drop not null;
alter table components alter column file_name drop not null;
alter table components add column if not exists module_url text;

-- module_url components are freely selectable (they're meant to be synced from a Framer
-- project organized into Free/Pro folders, but the URL itself is copyable by anyone who has
-- it regardless of tier — see the sync-framer-components function's comments for why this is
-- a real, accepted tradeoff, not an oversight).
