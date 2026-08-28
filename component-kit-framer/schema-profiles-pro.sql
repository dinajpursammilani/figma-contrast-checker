-- Pro plan status, set by the Polar webhook (service role), never by the client directly.
alter table profiles add column if not exists is_pro boolean not null default false;
alter table profiles add column if not exists polar_customer_id text;

-- The existing "Users can update their own profile" policy checks auth.uid() = id, but that
-- alone would let a signed-in user set is_pro = true on themselves via a normal client update
-- call. Restrict which columns authenticated users can actually write; is_pro and
-- polar_customer_id are only ever touched by the webhook function using the service role key,
-- which bypasses RLS/grants entirely.
revoke update on profiles from authenticated;
grant update (full_name, onboarding_completed, onboarding_answers, updated_at) on profiles to authenticated;
