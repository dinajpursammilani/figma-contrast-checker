# Polar payment setup

Everything is built and wired up. What's left is plugging in real values and deploying — a
few minutes of work once Dominik's sandbox org details land.

## 1. Run the SQL migration

In the Supabase SQL editor, run `schema-profiles-pro.sql` (adds `is_pro` /
`polar_customer_id` to `profiles`, and locks those columns so only the service role — used by
the webhook function, never the client — can write them).

## 2. Link the Supabase CLI to the project (one-time)

```bash
cd component-kit-framer
supabase login
supabase link --project-ref jmywnalmehibzwvwwplz
```

## 3. Set the function secrets

From Dominik: sandbox org access token, product ID for the Pro plan, and (after step 5) the
webhook signing secret.

```bash
supabase secrets set POLAR_ACCESS_TOKEN=polar_oat_xxx
supabase secrets set POLAR_PRODUCT_ID=prod_xxx
supabase secrets set POLAR_SERVER=sandbox
supabase secrets set POLAR_SUCCESS_URL=https://polar.sh/
supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxx   # from step 5, add once known
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are already available to
Edge Functions automatically — no need to set those.)

## 4. Deploy the functions

```bash
supabase functions deploy polar-checkout
supabase functions deploy polar-webhook
```

This prints the webhook function's URL, something like:
`https://jmywnalmehibzwvwwplz.supabase.co/functions/v1/polar-webhook`

## 5. Register the webhook in Polar

In the sandbox org → Settings → Webhooks → Add Endpoint, paste that URL. Select at least:
`order.paid`, `subscription.active`, `subscription.canceled`, `subscription.revoked`. Copy the
signing secret it gives you back into step 3.

## 6. Test end to end

Open the plugin → Settings → "Upgrade to Pro" → complete Polar's sandbox checkout (no real
card needed in sandbox) → reopen the plugin → Settings should now show "Pro".

## Going live later

Same steps again, but: create a production org (or switch the same org out of sandbox),
`POLAR_SERVER=production`, a production access token/product ID, and a separate production
webhook endpoint + secret.
