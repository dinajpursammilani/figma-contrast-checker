import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"

/** Rendered instead of the normal plugin app when this tab is the Google OAuth redirect
 * landing page (opened separately, since we can't navigate the Framer plugin iframe itself
 * through an external OAuth flow). Exchanges the code Supabase left in the URL for a session
 * and hands it back to the plugin tab via BroadcastChannel — not window.opener.postMessage,
 * since Google's own sign-in page sets a Cross-Origin-Opener-Policy that severs window.opener
 * on this popup before it ever gets here. BroadcastChannel doesn't depend on that reference. */
export default function OAuthCallback() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working")

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error }) => {
      if (error || !data.session) {
        setStatus("error")
        return
      }
      new BroadcastChannel("skela-oauth").postMessage({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      })
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
