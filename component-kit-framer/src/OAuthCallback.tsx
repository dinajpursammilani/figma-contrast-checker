import { useEffect, useRef, useState } from "react"
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
  // React 18 StrictMode runs effects twice in development to catch missing cleanup — without
  // this guard, that fires the relay POST twice: the first insert succeeds, the second fails
  // on the duplicate relayId primary key, showing a scary "something went wrong" even though
  // sign-in already actually completed.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

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
        // Best-effort — Chrome only allows a script-closable tab to close itself in narrower
        // cases than "navigated through a third party's domain and back," which is exactly
        // what just happened here. When it doesn't work, the copy below tells the user to
        // close it and switch back themselves — same as they already do for Polar checkout.
        window.close()
      })
  }, [])

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#17171a",
        textAlign: "center",
        padding: 24,
      }}
    >
      {status === "working" && <div style={{ fontSize: 14, color: "#6f6f75" }}>Signing you in…</div>}
      {status === "done" && (
        <>
          <div style={{ fontSize: 16, fontWeight: 700 }}>You're signed in to Skela</div>
          <div style={{ fontSize: 13, color: "#6f6f75" }}>Close this tab and switch back to Framer.</div>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#6f6f75" }}>Close this tab and try again from Framer.</div>
        </>
      )}
    </div>
  )
}
