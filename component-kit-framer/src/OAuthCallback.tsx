import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"

/** Rendered instead of the normal plugin app when this tab is the Google OAuth redirect
 * landing page (opened separately, since we can't navigate the Framer plugin iframe itself
 * through an external OAuth flow). With the implicit flow, Supabase leaves the tokens directly
 * in the URL hash — no code exchange needed. Hands them to the plugin iframe via the
 * oauth-relay Edge Function, keyed by the relayId passed through in the redirect URL — not
 * window.opener.postMessage (severed by Google's own Cross-Origin-Opener-Policy) or
 * BroadcastChannel (turned out to be partitioned separately for this top-level tab vs. the
 * plugin's iframe, same as localStorage — neither survives that boundary). */
export default function OAuthCallback() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working")

  useEffect(() => {
    const relayId = new URLSearchParams(window.location.search).get("relay")
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")

    if (!relayId || !accessToken || !refreshToken) {
      setStatus("error")
      return
    }

    supabase.functions
      .invoke("oauth-relay", { body: { action: "store", relayId, accessToken, refreshToken } })
      .then(({ error }) => {
        if (error) {
          setStatus("error")
          return
        }
        setStatus("done")
        setTimeout(() => window.close(), 800)
      })
  }, [])

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 14,
        color: "#17171a",
      }}
    >
      {status === "working" && "Signing you in…"}
      {status === "done" && "Signed in — you can close this tab."}
      {status === "error" && "Something went wrong — close this tab and try again."}
    </div>
  )
}
