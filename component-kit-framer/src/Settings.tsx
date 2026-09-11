import { useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"
import { getProStatus } from "./lib/payments"
import { getFullName } from "./lib/profile"
import { fetchPricing, updatePricing, formatPrice, type Pricing } from "./lib/pricing"
import { MoonIcon, SunIcon, CrownIcon, RefreshIcon, ImageStackIcon, CodeIcon, LockIcon, TrashIcon, CreditCardIcon, MessageIcon, FormIcon, KeyboardIcon } from "./icons"
import { updateProAvailable, updateUiOpacity } from "./lib/appSettings"
import { FillSlider } from "./components/FillSlider"
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
import ReviewSync from "./ReviewSync"
import ProDrawer from "./ProDrawer"
import LegalDoc from "./LegalDoc"
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from "./legalContent"
import { fetchStagedComponents } from "./lib/stagedComponents"

type ThemePref = "light" | "dark"

function initialsFor(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || parts[0].slice(0, 2).toUpperCase()
  }
  return (email ?? "").slice(0, 2).toUpperCase()
}

export default function Settings({
  user,
  theme,
  onToggleTheme,
  onLogOut,
  onComponentsChanged,
  proAvailable,
  onProAvailableChanged,
  isSuperAdmin,
  uiOpacity,
  onUiOpacityChanged,
}: {
  user: User
  theme: ThemePref
  onToggleTheme: () => void
  onLogOut: () => void
  onComponentsChanged: () => void
  proAvailable: boolean | null
  onProAvailableChanged: (v: boolean) => void
  isSuperAdmin: boolean
  uiOpacity: number
  onUiOpacityChanged: (v: number) => void
}) {
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [showProDrawer, setShowProDrawer] = useState(false)
  const [fullName, setFullName] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
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
  const [showReviewSync, setShowReviewSync] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [showDevTools, setShowDevTools] = useState(false)
  const [showLegal, setShowLegal] = useState<"terms" | "privacy" | null>(null)
  const [showSyncProjects, setShowSyncProjects] = useState(false)
  const [allowedProjects, setAllowedProjects] = useState<AllowedSyncProject[] | null>(null)
  const [syncProjectsBusy, setSyncProjectsBusy] = useState(false)
  const [syncProjectsStatus, setSyncProjectsStatus] = useState<string | null>(null)
  const [proToggleBusy, setProToggleBusy] = useState(false)
  const [proToggleStatus, setProToggleStatus] = useState<string | null>(null)
  const [opacitySaving, setOpacitySaving] = useState(false)
  const [opacityStatus, setOpacityStatus] = useState<string | null>(null)
  const opacitySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAdmin = isAdminEmail(user.email)

  async function handleToggleProAvailable() {
    const next = !proAvailable
    setProToggleBusy(true)
    setProToggleStatus(null)
    try {
      await updateProAvailable(next)
      onProAvailableChanged(next)
    } catch (err) {
      setProToggleStatus(err instanceof Error ? err.message : "Couldn't save — check the table/function are deployed")
    } finally {
      setProToggleBusy(false)
    }
  }

  function handleOpacityChange(next: number) {
    // Applied to local state (and the whole app) immediately on every drag tick, but the actual
    // network write is debounced — persisting on every pixel of a pointer drag would spam the
    // edge function.
    onUiOpacityChanged(next)
    if (opacitySaveTimer.current) clearTimeout(opacitySaveTimer.current)
    setOpacitySaving(true)
    setOpacityStatus(null)
    opacitySaveTimer.current = setTimeout(async () => {
      try {
        await updateUiOpacity(next)
      } catch (err) {
        setOpacityStatus(err instanceof Error ? err.message : "Couldn't save — check the table/function are deployed")
      } finally {
        setOpacitySaving(false)
      }
    }, 300)
  }

  useEffect(() => {
    getFullName(user.id).then(setFullName)
  }, [user.id])

  function refreshPendingCount() {
    if (!isAdmin) return
    fetchStagedComponents()
      .then((rows) => setPendingCount(rows.length))
      .catch(() => {})
  }

  useEffect(refreshPendingCount, [isAdmin])

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
        `Staged ${result.staged} component${result.staged === 1 ? "" : "s"} from "${result.projectName}" for review.` +
          (result.skipped.length ? ` Skipped: ${result.skipped.join(", ")}` : "")
      )
      refreshPendingCount()
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
        isSuperAdmin={isSuperAdmin}
        onBack={() => {
          setShowEditComponents(false)
          onComponentsChanged()
        }}
      />
    )
  }

  if (showReviewSync) {
    return (
      <ReviewSync
        onBack={() => {
          setShowReviewSync(false)
          refreshPendingCount()
        }}
        onImported={onComponentsChanged}
      />
    )
  }

  if (showLegal) {
    return (
      <LegalDoc
        title={showLegal === "terms" ? "Terms of Service" : "Privacy Policy"}
        sections={showLegal === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS}
        onBack={() => setShowLegal(null)}
      />
    )
  }

  return (
    <div className="settings">
      <div className="settings-group">
        <div className="settings-row">
          <span className="st-avatar">{initialsFor(fullName, user.email ?? null)}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 700 }}>{fullName || "Your account"}</span>
            <span className="admin-row-sub">{user.email}</span>
          </span>
        </div>
      </div>

      <div className="settings-group-label">Plan</div>
      <div className="settings-group">
        {isPro ? (
          <div className="pro-card" style={{ margin: 12 }}>
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
              <button className="settings-upgrade-row" onClick={() => setShowProDrawer(true)}>
                <span className="settings-upgrade-crown">
                  <CrownIcon />
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontWeight: 700 }}>
                    {proAvailable === false ? "Pro — coming soon" : "Upgrade to Pro"}
                  </span>
                  <span className="admin-row-sub">
                    {proAvailable === false ? "We're building the Pro library" : "Every component, unlocked"}
                  </span>
                </span>
                <span className="settings-row-chevron">›</span>
              </button>
            )}
          </>
        )}
      </div>

      <div className="settings-group-label">Preferences</div>
      <div className="settings-group">
        <div className="settings-row">
          <span style={{ display: "flex", alignItems: "center" }}>
            <span className="settings-row-icon">{theme === "dark" ? <MoonIcon /> : <SunIcon />}</span>
            Theme
          </span>
          <div className="colors-theme-toggle">
            <button className={theme === "light" ? "active" : ""} onClick={() => theme !== "light" && onToggleTheme()} title="Light theme">
              <SunIcon />
            </button>
            <button className={theme === "dark" ? "active moon" : ""} onClick={() => theme !== "dark" && onToggleTheme()} title="Dark theme">
              <MoonIcon />
            </button>
          </div>
        </div>
        <button className="settings-row clickable" onClick={() => setShowShortcuts((v) => !v)}>
          <span className="settings-row-icon">
            <KeyboardIcon />
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>Keyboard shortcuts</span>
          <span className="settings-row-chevron">{showShortcuts ? "⌄" : "›"}</span>
        </button>
      </div>

      {showShortcuts && (
        <div className="admin-devtools" style={{ margin: "-8px 0 16px" }}>
          <div className="shortcut-group-label">Go to — spells S·K·E·L·A</div>
          <div className="shortcut-row"><span>Home</span><span className="kbd">S</span></div>
          <div className="shortcut-row"><span>Build</span><span className="kbd">K</span></div>
          <div className="shortcut-row"><span>Boards</span><span className="kbd">E</span></div>
          <div className="shortcut-row"><span>Colors</span><span className="kbd">L</span></div>
          <div className="shortcut-row"><span>Settings</span><span className="kbd">A</span></div>
          <div className="shortcut-group-label">General</div>
          <div className="shortcut-row"><span>Focus search</span><span className="kbd">/</span></div>
          <div className="shortcut-row"><span>Close panel</span><span className="kbd">Esc</span></div>
          <div className="shortcut-row"><span>Navigate results</span><span className="kbd">↑ ↓</span></div>
          <div className="shortcut-row"><span>Insert selected</span><span className="kbd">Enter</span></div>
          <div className="shortcut-row"><span>Command palette</span><span className="kbd">⌘K</span></div>
        </div>
      )}

      <div className="settings-group-label">Support</div>
      <div className="settings-group">
        {SUPPORT_EMAIL ? (
          <a className="settings-row clickable" href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="settings-row-icon">
              <MessageIcon />
            </span>
            <span style={{ flex: 1 }}>Report a bug or request a component</span>
            <span className="settings-row-chevron">›</span>
          </a>
        ) : (
          <div className="settings-row">
            <span className="settings-muted">Support contact not set up yet.</span>
          </div>
        )}
        <button className="settings-row clickable" onClick={() => setShowLegal("terms")}>
          <span className="settings-row-icon">
            <FormIcon />
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>Terms of Service</span>
          <span className="settings-row-chevron">›</span>
        </button>
        <button className="settings-row clickable" onClick={() => setShowLegal("privacy")}>
          <span className="settings-row-icon">
            <FormIcon />
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>Privacy Policy</span>
          <span className="settings-row-chevron">›</span>
        </button>
      </div>

      {isAdmin && (
        <div className="settings-section">
          <div className="settings-group-label">
            Admin <span className="admin-badge">ADMIN ONLY</span>
          </div>

          <button className="admin-row" onClick={() => setShowEditComponents(true)}>
            <span className="admin-row-icon">
              <ImageStackIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Edit Components</span>
              <span className="admin-row-sub">Names, sections, categories, tiers, preview images</span>
            </span>
            <span className="admin-row-chevron">›</span>
          </button>

          <div className="admin-row static">
            <span className="admin-row-icon">
              <CrownIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Pro available</span>
              <span className="admin-row-sub">
                {proAvailable === false ? "Off — every Pro surface shows “Coming soon”" : "On — real checkout is live"}
              </span>
            </span>
            <button
              className={`bool-switch ${proAvailable ? "on" : ""}`}
              onClick={handleToggleProAvailable}
              disabled={proToggleBusy || proAvailable === null}
              aria-label="Toggle Pro availability"
            />
          </div>
          {proToggleStatus && <p className="settings-muted">{proToggleStatus}</p>}

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
              <span className="admin-row-sub">Stages every Component here for review — nothing goes live yet</span>
            </span>
          </button>
          {syncStatus && <p className="settings-muted">{syncStatus}</p>}

          <button className="admin-row" onClick={() => setShowReviewSync(true)}>
            <span className="admin-row-icon">
              <ImageStackIcon />
            </span>
            <span className="admin-row-text">
              <span className="admin-row-title">Review Sync</span>
              <span className="admin-row-sub">
                {pendingCount === null
                  ? "Check tier/category before importing"
                  : pendingCount === 0
                    ? "Nothing pending"
                    : `${pendingCount} component${pendingCount === 1 ? "" : "s"} awaiting review`}
              </span>
            </span>
            <span className="admin-row-chevron">›</span>
          </button>

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

      {isSuperAdmin && (
        <div className="settings-section">
          <div className="settings-group-label">Super Admin</div>
          <div className="admin-row stacked">
            <span className="admin-row-text">
              <span className="admin-row-title">Interface opacity</span>
              <span className="admin-row-sub">
                Applies to everyone except you{opacitySaving ? " — saving…" : ""} · {Math.round(uiOpacity * 100)}%
              </span>
            </span>
            <FillSlider min={0} max={1} step={0.01} value={uiOpacity} onChange={handleOpacityChange} />
          </div>
          {opacityStatus && <p className="settings-muted">{opacityStatus}</p>}
        </div>
      )}

      <div className="settings-group danger">
        <button
          className="settings-row clickable"
          onClick={async () => {
            await signOut()
            onLogOut()
          }}
        >
          <span className="settings-row-icon" style={{ background: "rgba(229, 72, 77, 0.16)", color: "var(--danger)" }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9" />
            </svg>
          </span>
          <span style={{ flex: 1, textAlign: "left", color: "var(--danger)", fontWeight: 700 }}>Log out</span>
        </button>
      </div>

      {showProDrawer && (
        <ProDrawer
          proAvailable={proAvailable}
          onClose={() => {
            setShowProDrawer(false)
            getProStatus().then(setIsPro)
          }}
        />
      )}
    </div>
  )
}
