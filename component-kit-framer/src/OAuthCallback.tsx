import { useEffect, useState } from "react"

/** Rendered instead of the normal plugin app when this tab is the Google OAuth redirect
 * landing page (opened separately, since we can't navigate the Framer plugin iframe itself
 * through an external OAuth flow). With the implicit flow, Supabase leaves the tokens directly
 * in the URL hash — no code exchange needed (and no storage round-trip, which matters here:
 * PKCE's code-verifier storage write happens inside the plugin's iframe, partitioned away from
 * this popup's own top-level storage, so PKCE can never complete across this boundary). Hands
 * the tokens to the plugin tab via BroadcastChannel — not window.opener.postMessage, since
 * Google's own sign-in page sets a Cross-Origin-Opener-Policy that severs window.opener on
 * this popup before it ever gets here. */
export default function OAuthCallback() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working")

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (!accessToken || !refreshToken) {
      setStatus("error")
      return
    }

    new BroadcastChannel("skela-oauth").postMessage({ accessToken, refreshToken })
    setStatus("done")
    setTimeout(() => window.close(), 800)
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
