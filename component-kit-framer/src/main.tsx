import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "@framer/plugin"
import App from "./App"
import OAuthCallback from "./OAuthCallback"
import "@framer/plugin/framer.css"
import "./App.css"

// The Google OAuth redirect lands back on this same URL, but in a separate tab we opened
// ourselves rather than inside Framer's plugin iframe — render the callback handler instead
// of the app, and skip showUI since there's no Framer host here. Deliberately NOT checking
// window.opener: Google's own sign-in page sets a Cross-Origin-Opener-Policy that severs it,
// so the only reliable signal left is the "code" param Supabase leaves in the URL.
const isOAuthCallback = new URLSearchParams(window.location.search).has("code")

if (!isOAuthCallback) {
  void framer.showUI({
    position: "top right",
    width: 400,
    height: 560,
    resizable: false,
  })
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isOAuthCallback ? <OAuthCallback /> : <App />}</React.StrictMode>
)
