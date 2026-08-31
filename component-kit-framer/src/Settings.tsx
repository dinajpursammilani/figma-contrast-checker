import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"
import { getProStatus, startCheckout } from "./lib/payments"
import { getFullName } from "./lib/profile"
import { MoonIcon, SunIcon, CrownIcon, RefreshIcon, ImageStackIcon, CodeIcon } from "./icons"
import { SUPPORT_EMAIL } from "./lib/support"
import { insertFromModuleUrl, insertLinkedFromUrl } from "./nodeBuilders"
import { syncComponentsFromCurrentProject } from "./lib/sync"
import { listTaggableComponents, tagComponent } from "./lib/tierTag"
import { isAdminEmail } from "./lib/admin"
import EditComponents from "./EditComponents"

type ThemePref = "light" | "dark"

export default function Settings({
  user,
  theme,
  onToggleTheme,
  onLogOut,
  onComponentsChanged,
}: {
  user: User
  theme: ThemePref
  onToggleTheme: () => void
  onLogOut: () => void
  onComponentsChanged: () => void
}) {
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [testUrl, setTestUrl] = useState("")
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showEditComponents, setShowEditComponents] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [showTagTool, setShowTagTool] = useState(false)
  const [taggableComponents, setTaggableComponents] = useState<{ id: string; name: string | null }[] | null>(null)
  const [tagComponentId, setTagComponentId] = useState("")
  const [tagTier, setTagTier] = useState<"pro" | "free">("free")
  const [tagCategory, setTagCategory] = useState("")
  const [tagStatus, setTagStatus] = useState<string | null>(null)
  const [tagging, setTagging] = useState(false)
  const isAdmin = isAdminEmail(user.email)

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
      onComponentsChanged()
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  function openTagTool() {
    setShowTagTool((v) => !v)
    if (!taggableComponents) {
      listTaggableComponents().then(setTaggableComponents).catch(() => setTaggableComponents([]))
    }
  }

  async function runTagSelected() {
    if (!tagComponentId) {
      setTagStatus("Pick a component first.")
      return
    }
    setTagging(true)
    setTagStatus(null)
    try {
      const name = await tagComponent(tagComponentId, tagTier, tagCategory)
      setTagStatus(`Tagged "${name}" as ${tagTier === "pro" ? "Pro" : "Free"}${tagCategory.trim() ? ` / ${tagCategory.trim()}` : ""}. Sync to apply.`)
    } catch (err) {
      setTagStatus(err instanceof Error ? err.message : "Tagging failed")
    } finally {
      setTagging(false)
    }
  }

  if (showEditComponents) {
    return (
      <EditComponents
        onBack={() => {
          setShowEditComponents(false)
          onComponentsChanged()
        }}
      />
    )
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

      {isAdmin && (
        <div className="settings-section">
          <h3>Admin</h3>

          <button className="admin-row" onClick={() => setShowEditComponents(true)}>
            <span className="admin-row-icon">
              <ImageStackIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Edit Components</span>
              <span className="admin-row-sub">Names, categories, tiers, preview images</span>
            </span>
            <span className="admin-row-chevron">›</span>
          </button>

          <button className="admin-row" onClick={openTagTool}>
            <span className="admin-row-icon">
              <CrownIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Tag a component</span>
              <span className="admin-row-sub">Set Pro/Free + category — survives renaming</span>
            </span>
            <span className="admin-row-chevron">{showTagTool ? "⌄" : "›"}</span>
          </button>

          {showTagTool && (
            <div className="admin-devtools">
              {!taggableComponents ? (
                <p className="settings-muted">Loading components from this project…</p>
              ) : taggableComponents.length === 0 ? (
                <p className="settings-muted">No Components found in this project.</p>
              ) : (
                <>
                  <select
                    className="settings-input"
                    value={tagComponentId}
                    onChange={(e) => setTagComponentId(e.target.value)}
                  >
                    <option value="">Pick a component…</option>
                    {taggableComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name ?? c.id}
                      </option>
                    ))}
                  </select>
                  <div className="onboarding-toggle-row">
                    <button className={`onboarding-toggle ${tagTier === "free" ? "selected" : ""}`} onClick={() => setTagTier("free")}>
                      Free
                    </button>
                    <button className={`onboarding-toggle ${tagTier === "pro" ? "selected" : ""}`} onClick={() => setTagTier("pro")}>
                      Pro
                    </button>
                  </div>
                  <input
                    className="settings-input"
                    type="text"
                    placeholder="Category (optional)"
                    value={tagCategory}
                    onChange={(e) => setTagCategory(e.target.value)}
                  />
                  <button className="settings-toggle" onClick={runTagSelected} disabled={tagging}>
                    {tagging ? "Tagging…" : "Tag component"}
                  </button>
                </>
              )}
              {tagStatus && <p className="settings-muted">{tagStatus}</p>}
            </div>
          )}

          <button className="admin-row" onClick={runSync} disabled={syncing}>
            <span className="admin-row-icon">
              <RefreshIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">{syncing ? "Syncing…" : "Sync from this project"}</span>
              <span className="admin-row-sub">Reads every Component in the open Framer project</span>
            </span>
          </button>
          {syncStatus && <p className="settings-muted">{syncStatus}</p>}

          <button className="admin-row" onClick={() => setShowDevTools((v) => !v)}>
            <span className="admin-row-icon">
              <CodeIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Developer tools</span>
              <span className="admin-row-sub">Test-insert a Module URL directly</span>
            </span>
            <span className="admin-row-chevron">{showDevTools ? "⌄" : "›"}</span>
          </button>

          {showDevTools && (
            <div className="admin-devtools">
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
          )}
        </div>
      )}
    </div>
  )
}
