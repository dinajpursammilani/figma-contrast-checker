import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"
import { getProStatus, startCheckout } from "./lib/payments"
import { getFullName } from "./lib/profile"
import { MoonIcon, SunIcon, CrownIcon } from "./icons"
import { SUPPORT_EMAIL } from "./lib/support"
import { insertFromModuleUrl, insertLinkedFromUrl } from "./nodeBuilders"
import { syncComponentsFromCurrentProject } from "./lib/sync"

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
  const [testUrl, setTestUrl] = useState("")
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

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

  async function runTestInsert(mode: "linked" | "detached") {
    const url = testUrl.trim()
    if (!url) return
    setTestStatus("Inserting…")
    try {
      if (mode === "linked") {
        await insertLinkedFromUrl(url)
      } else {
        await insertFromModuleUrl(url)
      }
      setTestStatus(`Inserted (${mode}). Check the canvas.`)
    } catch (err) {
      setTestStatus(err instanceof Error ? err.message : "Insert failed")
    }
  }

  async function runSync() {
    setSyncing(true)
    setSyncStatus("Reading components from this project…")
    try {
      const result = await syncComponentsFromCurrentProject()
      setSyncStatus(
        `Synced ${result.synced} component${result.synced === 1 ? "" : "s"}.` +
          (result.skipped.length ? ` Skipped: ${result.skipped.join(", ")}` : "")
      )
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
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
              <button className="settings-upgrade-btn" onClick={handleUpgrade} disabled={checkingOut}>
                <CrownIcon />
                {checkingOut ? "Opening checkout…" : "Upgrade to Pro"}
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
          <button
            className={`theme-switch ${theme === "dark" ? "is-dark" : ""}`}
            onClick={onToggleTheme}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Toggle theme"
          >
            <span className="theme-switch-thumb">
              {theme === "dark" ? <MoonIcon /> : <SunIcon />}
            </span>
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

      <div className="settings-section">
        <h3>Developer</h3>
        <p className="settings-muted">
          Reads every Component in whatever Framer project is currently open and syncs it into the shared
          catalog (needs an admin account — see ADMIN_EMAILS on sync-framer-components).
        </p>
        <button className="settings-upgrade-btn" onClick={runSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync components from this project"}
        </button>
        {syncStatus && <p className="settings-muted">{syncStatus}</p>}

        <p className="settings-muted" style={{ marginTop: 16 }}>
          Paste a component's Module URL (Framer → Assets → right-click a component → Copy URL) to test
          inserting it directly, bypassing the catalog.
        </p>
        <input
          className="settings-input"
          type="text"
          placeholder="https://framer.com/m/…"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
        />
        <div className="settings-row" style={{ gap: 8 }}>
          <button className="settings-toggle" onClick={() => runTestInsert("linked")}>
            Insert linked
          </button>
          <button className="settings-toggle" onClick={() => runTestInsert("detached")}>
            Insert detached
          </button>
        </div>
        {testStatus && <p className="settings-muted">{testStatus}</p>}
      </div>
    </div>
  )
}
