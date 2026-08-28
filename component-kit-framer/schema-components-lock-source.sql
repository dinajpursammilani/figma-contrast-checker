-- Pro components' tsx_source must not be downloadable by free users just by listing the
-- catalog (fetchComponents no longer selects it). This closes that at the DB level too, so a
-- direct `select tsx_source from components` from the client fails outright — the only way to
-- get a Pro component's source is the get-component-source Edge Function, which checks
-- profiles.is_pro with the service role before returning it.
revoke select (tsx_source) on components from anon, authenticated;
