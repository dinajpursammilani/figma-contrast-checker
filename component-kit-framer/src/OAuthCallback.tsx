import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"

/** Rendered instead of the normal plugin app when this tab is the Google OAuth redirect
 * landing page (opened separately, since we can't navigate the Framer plugin iframe itself
 * through an external OAuth flow). Exchanges the code Supabase left in the URL for a session,
 * hands it back to the plugin tab that opened us via postMessage, then closes itself. */
export default function OAuthCallback() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working")

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error }) => {
      if (error || !data.session) {
        setStatus("error")
        return
      }
      window.opener?.postMessage(
        {
          type: "skela-oauth-session",
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        },
        window.location.origin
      )
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
