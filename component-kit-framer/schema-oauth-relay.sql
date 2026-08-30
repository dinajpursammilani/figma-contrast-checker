-- Short-lived, single-use handoff for the Google OAuth tokens between the callback tab and the
-- plugin iframe — see supabase/functions/oauth-relay/index.ts. Never readable by clients
-- directly (no RLS policy grants any access at all); only the Edge Function's service-role key
-- can touch it.
create table if not exists oauth_relay (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  created_at timestamptz not null default now()
);

alter table oauth_relay enable row level security;
-- No policies: RLS with zero policies denies all client access by default, which is exactly
-- what we want — this table is a service-role-only mailbox.
