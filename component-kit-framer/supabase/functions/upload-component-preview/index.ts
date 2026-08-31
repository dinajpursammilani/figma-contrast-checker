// Uploads a real preview image (screenshot) for one catalog component — admin-only, since this
// writes into the shared catalog everyone sees. Same auth pattern as sync-framer-components:
// caller must be signed in as one of ADMIN_EMAILS. Stores the file in the public
// component-previews Storage bucket and points the component's preview_image_url at it.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())
const BUCKET = "component-previews"
const MAX_BYTES = 500 * 1024 // 500KB — a card thumbnail never needs to be bigger than this

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing Authorization header")

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user?.email) throw new Error("Not authenticated")

    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Not an admin account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const form = await req.formData()
    const componentId = form.get("componentId")
    const file = form.get("file")
    if (typeof componentId !== "string" || !componentId) throw new Error("Missing componentId")
    if (!(file instanceof File)) throw new Error("Missing file")
    if (file.size > MAX_BYTES) throw new Error("Image too large — 500KB max")
    if (!file.type.startsWith("image/")) throw new Error("File must be an image")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg"
    const path = `${componentId}.${ext}`

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path)
    // Cache-bust — overwriting the same path would otherwise keep showing a stale cached copy
    // at the identical URL.
    const url = `${publicUrlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await admin.from("components").update({ preview_image_url: url }).eq("id", componentId)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
