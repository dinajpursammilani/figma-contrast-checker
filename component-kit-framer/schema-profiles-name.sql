-- Adds an optional display name to profiles, for the personalized greeting and (later) account page.
alter table profiles add column if not exists full_name text;
