import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"
import { getProStatus } from "./lib/payments"
import { getFullName } from "./lib/profile"
import { fetchPricing, updatePricing, formatPrice, type Pricing } from "./lib/pricing"
import { MoonIcon, SunIcon, CrownIcon, RefreshIcon, ImageStackIcon, CodeIcon, LockIcon, TrashIcon, CreditCardIcon } from "./icons"
import { SUPPORT_EMAIL } from "./lib/support"
import { insertFromModuleUrl, insertLinkedFromUrl } from "./nodeBuilders"
import { syncComponentsFromCurrentProject } from "./lib/sync"
import { isAdminEmail } from "./lib/admin"
import {
  listAllowedSyncProjects,
  addCurrentProjectToAllowlist,
  removeAllowedSyncProject,
  type AllowedSyncProject,
} from "./lib/syncProjects"
import EditComponents from "./EditComponents"
import ProDrawer from "./ProDrawer"

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
  const [showProDrawer, setShowProDrawer] = useState(false)
  const [fullName, setFullName] = useState<string | null>(null)
  const [showEditPricing, setShowEditPricing] = useState(false)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [priceInput, setPriceInput] = useState("")
  const [pricingBusy, setPricingBusy] = useState(false)
  const [pricingStatus, setPricingStatus] = useState<string | null>(null)
  const [testUrl, setTestUrl] = useState("")
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showEditComponents, setShowEditComponents] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [showSyncProjects, setShowSyncProjects] = useState(false)
  const [allowedProjects, setAllowedProjects] = useState<AllowedSyncProject[] | null>(null)
  const [syncProjectsBusy, setSyncProjectsBusy] = useState(false)
  const [syncProjectsStatus, setSyncProjectsStatus] = useState<string | null>(null)
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

  function openEditPricing() {
    setShowEditPricing((v) => !v)
    if (!pricing) {
      fetchPricing()
        .then((p) => {
          setPricing(p)
          setPriceInput((p.amountCents / 100).toString())
        })
        .catch(() => setPricingStatus("Couldn't load current price"))
    }
  }

  async function handleSavePricing() {
    const dollars = Number(priceInput)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setPricingStatus("Enter a valid price")
      return
    }
    setPricingBusy(true)
    setPricingStatus(null)
    try {
      const amountCents = Math.round(dollars * 100)
      await updatePricing(amountCents)
      setPricing({ amountCents, currency: pricing?.currency ?? "usd" })
      setPricingStatus("Saved.")
    } catch (err) {
      setPricingStatus(err instanceof Error ? err.message : "Couldn't save")
    } finally {
      setPricingBusy(false)
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
        `Synced ${result.synced} component${result.synced === 1 ? "" : "s"} from "${result.projectName}".` +
          (result.skipped.length ? ` Skipped: ${result.skipped.join(", ")}` : "")
      )
      onComponentsChanged()
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  function openSyncProjects() {
    setShowSyncProjects((v) => !v)
    if (!allowedProjects) {
      listAllowedSyncProjects().then(setAllowedProjects).catch(() => setAllowedProjects([]))
    }
  }

  async function handleAddCurrentProject() {
    setSyncProjectsBusy(true)
    setSyncProjectsStatus(null)
    try {
      const added = await addCurrentProjectToAllowlist()
      setAllowedProjects((prev) => {
        const withoutDup = (prev ?? []).filter((p) => p.id !== added.id)
        return [...withoutDup, added]
      })
      setSyncProjectsStatus(`Added "${added.name}".`)
    } catch (err) {
      setSyncProjectsStatus(err instanceof Error ? err.message : "Couldn't add this project")
    } finally {
      setSyncProjectsBusy(false)
    }
  }

  async function handleRemoveProject(projectId: string) {
    setSyncProjectsBusy(true)
    setSyncProjectsStatus(null)
    try {
      await removeAllowedSyncProject(projectId)
      setAllowedProjects((prev) => prev?.filter((p) => p.id !== projectId) ?? prev)
    } catch (err) {
      setSyncProjectsStatus(err instanceof Error ? err.message : "Couldn't remove")
    } finally {
      setSyncProjectsBusy(false)
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
              <button className="settings-upgrade-btn" onClick={() => setShowProDrawer(true)}>
                <CrownIcon />
                Upgrade to Pro
              </button>
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

          <button className="admin-row" onClick={openEditPricing}>
            <span className="admin-row-icon">
              <CreditCardIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Edit Pricing</span>
              <span className="admin-row-sub">{pricing ? `Currently ${formatPrice(pricing)}` : "Change the Pro price shown in the app"}</span>
            </span>
            <span className="admin-row-chevron">{showEditPricing ? "⌄" : "›"}</span>
          </button>

          {showEditPricing && (
            <div className="admin-devtools">
              <div className="settings-row" style={{ gap: 8 }}>
                <span>$</span>
                <input
                  className="settings-input"
                  type="number"
                  min="1"
                  step="1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <button className="settings-toggle" onClick={handleSavePricing} disabled={pricingBusy}>
                {pricingBusy ? "Saving…" : "Save price"}
              </button>
              <p className="settings-muted">
                This only changes what's displayed in the app — update the price on the actual Polar product separately so they match.
              </p>
              {pricingStatus && <p className="settings-muted">{pricingStatus}</p>}
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

          <button className="admin-row" onClick={openSyncProjects}>
            <span className="admin-row-icon">
              <LockIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Allowed sync projects</span>
              <span className="admin-row-sub">
                {allowedProjects === null
                  ? "Restrict which Framer projects can sync"
                  : allowedProjects.length === 0
                    ? "Unrestricted — any project can sync"
                    : `${allowedProjects.length} project${allowedProjects.length === 1 ? "" : "s"} allowed`}
              </span>
            </span>
            <span className="admin-row-chevron">{showSyncProjects ? "⌄" : "›"}</span>
          </button>

          {showSyncProjects && (
            <div className="admin-devtools">
              {!allowedProjects ? (
                <p className="settings-muted">Loading…</p>
              ) : (
                <>
                  {allowedProjects.length === 0 ? (
                    <p className="settings-muted">
                      No projects added yet — sync is unrestricted. Add this project to lock sync down to it only.
                    </p>
                  ) : (
                    allowedProjects.map((p) => (
                      <div key={p.id} className="settings-row">
                        <span>{p.name}</span>
                        <button
                          className="edit-components-delete-btn"
                          onClick={() => handleRemoveProject(p.id)}
                          disabled={syncProjectsBusy}
                        >
                          <TrashIcon /> Remove
                        </button>
                      </div>
                    ))
                  )}
                  <button className="settings-toggle" onClick={handleAddCurrentProject} disabled={syncProjectsBusy}>
                    {syncProjectsBusy ? "Working…" : "+ Add this project"}
                  </button>
                </>
              )}
              {syncProjectsStatus && <p className="settings-muted">{syncProjectsStatus}</p>}
            </div>
          )}

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

      {showProDrawer && (
        <ProDrawer
          onClose={() => {
            setShowProDrawer(false)
            getProStatus().then(setIsPro)
          }}
        />
      )}
    </div>
  )
}
