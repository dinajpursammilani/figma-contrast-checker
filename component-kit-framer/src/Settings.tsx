import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"
import { getProStatus, startCheckout } from "./lib/payments"
import { getFullName } from "./lib/profile"
import { MoonIcon, SunIcon, CrownIcon } from "./icons"
import { SUPPORT_EMAIL } from "./lib/support"

type ThemePref = "light" | "dark"

export default function Settings({
  user,
  theme,
  onToggleTheme,
  onLogOut,
}: {
  user: User
  theme: ThemePref
  onToggleTheme: () => void
  onLogOut: () => void
}) {
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)

  useEffect(() => {
    getFullName(user.id).then(setFullName)
  }, [user.id])

  useEffect(() => {
    getProStatus().then(setIsPro)

    // Payment happens in a separate browser tab, so there's no way to push the result back in —
    // instead, refetch whenever the user switches focus back to Framer after checking out.
    function refetch() {
      if (document.visibilityState === "visible") getProStatus().then(setIsPro)
    }
    document.addEventListener("visibilitychange", refetch)
    window.addEventListener("focus", refetch)
    return () => {
      document.removeEventListener("visibilitychange", refetch)
      window.removeEventListener("focus", refetch)
    }
  }, [user.id])

  async function handleUpgrade() {
    setCheckingOut(true)
    setCheckoutError(null)
    try {
      await startCheckout()
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Couldn't start checkout — try again")
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="settings">
      <div className="settings-section">
        <h3>Account</h3>
        {fullName && (
          <div className="settings-row">
            <span>Name</span>
            <span className="settings-value">{fullName}</span>
          </div>
        )}
        <div className="settings-row">
          <span>Email</span>
          <span className="settings-value">{user.email}</span>
        </div>
        <button className="settings-danger" onClick={async () => {
          await signOut()
          onLogOut()
        }}>
          Log out
        </button>
      </div>

      <div className="settings-section">
        <h3>Plan</h3>
        {isPro ? (
          <div className="pro-card">
            <div className="pro-card-crown">
              <CrownIcon />
            </div>
            <div>
              <div className="pro-card-title">Pro member</div>
              <div className="pro-card-sub">Every component, unlocked</div>
            </div>
          </div>
        ) : (
          <>
            <div className="settings-row">
              <span>Current plan</span>
              <span className="settings-value">{isPro === null ? "…" : "Free"}</span>
            </div>
            {isPro === false && (
              <button className="settings-toggle" onClick={handleUpgrade} disabled={checkingOut}>
                {checkingOut ? "Opening checkout…" : "Upgrade to Pro →"}
              </button>
            )}
            {checkoutError && <p className="settings-muted">{checkoutError}</p>}
            {isPro === false && (
              <p className="settings-muted">Checkout opens in your browser — once you're done, switch back to Framer and this updates automatically.</p>
            )}
          </>
        )}
      </div>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <span>Theme</span>
          <button className="settings-toggle" onClick={onToggleTheme}>
            {theme === "dark" ? <MoonIcon /> : <SunIcon />} {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Feedback</h3>
        {SUPPORT_EMAIL ? (
          <a className="settings-link" href={`mailto:${SUPPORT_EMAIL}`}>
            Report a bug or request a component →
          </a>
        ) : (
          <p className="settings-muted">Support contact not set up yet.</p>
        )}
      </div>
    </div>
  )
}
