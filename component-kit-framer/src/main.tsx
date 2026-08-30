import React from "react"
import ReactDOM from "react-dom/client"

// The Google OAuth redirect lands back on this same URL, but in a separate tab we opened
// ourselves rather than inside Framer's plugin iframe — render the callback handler instead
// of the app, and skip showUI since there's no Framer host here. Using the implicit OAuth
// flow (see lib/supabase.ts for why), Supabase leaves the tokens in the URL *hash*, not a
// query param — deliberately not checking window.opener either: Google's own sign-in page
// sets a Cross-Origin-Opener-Policy that severs it before we ever get here.
//
// Both branches are dynamic imports on purpose: App's module graph (Framer SDK hooks, etc.)
// was previously imported statically at the top of this file unconditionally, and something
// in that chain throws at module-evaluation time when loaded outside Framer's iframe — which
// silently killed this entire file (including the OAuthCallback branch) before it ever ran.
// Dynamic imports mean the callback path never touches App's module graph at all.
const isOAuthCallback = window.location.hash.includes("access_token")

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)

  if (isOAuthCallback) {
    const { default: OAuthCallback } = await import("./OAuthCallback")
    root.render(
      <React.StrictMode>
        <OAuthCallback />
      </React.StrictMode>
    )
    return
  }

  const [{ framer }, { default: App }] = await Promise.all([
    import("@framer/plugin"),
    import("./App"),
    import("@framer/plugin/framer.css"),
    import("./App.css"),
  ])

  void framer.showUI({
    position: "top right",
    width: 400,
    height: 560,
    resizable: false,
  })

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void boot()
