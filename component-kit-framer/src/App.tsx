import { useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useMakeDraggable } from "@framer/plugin"
import { insertComponent, warmInsertUrl, getCachedInsertUrl } from "./nodeBuilders"
import { restoreSession } from "./lib/auth"
import { getData, setDataInBackground } from "./lib/pluginStorage"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { fetchComponentSource } from "./lib/componentSource"
import { getProStatus, startCheckout } from "./lib/payments"
import { getOnboardingStatus, getFullName, friendlyNameFromEmail } from "./lib/profile"
import Login from "./Login"
import Onboarding from "./Onboarding"
import Settings from "./Settings"
import Boards from "./Boards"
import Colors from "./Colors"
import SaveDrawer from "./SaveDrawer"

function DragHandleIcon() {
  return (
    <svg className="drag-handle-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.3" />
      <circle cx="10" cy="3" r="1.3" />
      <circle cx="4" cy="7" r="1.3" />
      <circle cx="10" cy="7" r="1.3" />
      <circle cx="4" cy="11" r="1.3" />
      <circle cx="10" cy="11" r="1.3" />
    </svg>
  )
}

function categoryIcon(category: string): string {
  switch (category) {
    case "Sections":
      return "🧩"
    case "Navigation":
      return "🧭"
    case "Cards":
      return "🗂️"
    default:
      return "✨"
  }
}

const THEME_KEY = "theme-preference"
type ThemePref = "light" | "dark"

function useTheme() {
  const [theme, setTheme] = useState<ThemePref>("dark")

  useEffect(() => {
    getData(THEME_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") setTheme(saved)
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      setDataInBackground(THEME_KEY, next)
      return next
    })
  }

  return { theme, toggle }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    restoreSession()
      .then(async (restoredUser) => {
        setUser(restoredUser)
        if (restoredUser) {
          const done = await getOnboardingStatus(restoredUser.id)
          setNeedsOnboarding(!done)
        }
      })
      .finally(() => setCheckingSession(false))
  }, [])

  async function handleLoggedIn(loggedInUser: User) {
    setUser(loggedInUser)
    setCheckingOnboarding(true)
    try {
      const done = await getOnboardingStatus(loggedInUser.id)
      setNeedsOnboarding(!done)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  if (checkingSession || checkingOnboarding) {
    return (
      <div className="app">
        <div className="empty" style={{ marginTop: 120 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLoggedIn={handleLoggedIn} />
  }

  if (needsOnboarding) {
    return <Onboarding userId={user.id} onDone={() => setNeedsOnboarding(false)} />
  }

  return <Shell user={user} onLogOut={() => setUser(null)} theme={theme} onToggleTheme={toggle} />
}

function Shell({
  user,
  onLogOut,
  theme,
  onToggleTheme,
}: {
  user: User
  onLogOut: () => void
  theme: ThemePref
  onToggleTheme: () => void
}) {
  const [view, setView] = useState<"home" | "boards" | "colors" | "settings">("home")

  return (
    <div className="shell">
      <div className="shell-content">
        {view === "home" && <Gallery user={user} />}
        {view === "boards" && <Boards />}
        {view === "colors" && <Colors />}
        {view === "settings" && (
          <Settings user={user} theme={theme} onToggleTheme={onToggleTheme} onLogOut={onLogOut} />
        )}
      </div>
      <div className="bottom-nav">
        <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
          🏠 Home
        </button>
        <button className={`nav-btn ${view === "boards" ? "active" : ""}`} onClick={() => setView("boards")}>
          🔖 Boards
        </button>
        <button className={`nav-btn ${view === "colors" ? "active" : ""}`} onClick={() => setView("colors")}>
          🎨 Colors
        </button>
        <button className={`nav-btn ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          ⚙️ Settings
        </button>
      </div>
    </div>
  )
}

function Gallery({ user }: { user: User }) {
  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savingComponent, setSavingComponent] = useState<ComponentRow | null>(null)
  const [detailComponent, setDetailComponent] = useState<ComponentRow | null>(null)
  const [greetingName, setGreetingName] = useState<string>(user.email ? friendlyNameFromEmail(user.email) : "there")
  const [warmedFiles, setWarmedFiles] = useState<Set<string>>(new Set())
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [screen, setScreen] = useState<"tiles" | "browse">("tiles")

  useEffect(() => {
    getFullName(user.id).then((name) => {
      if (name) setGreetingName(name)
    })
  }, [user.id])

  useEffect(() => {
    getProStatus().then(setIsPro)

    // Same reasoning as Settings: checkout happens in a separate tab, so refetch on refocus
    // instead of requiring a manual reload to unlock Pro components after paying.
    function refetch() {
      if (document.visibilityState === "visible") getProStatus().then(setIsPro)
    }
    document.addEventListener("visibilitychange", refetch)
    window.addEventListener("focus", refetch)
    return () => {
      document.removeEventListener("visibilitychange", refetch)
      window.removeEventListener("focus", refetch)
    }
  }, [])

  useEffect(() => {
    fetchComponents()
      .then(setComponents)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the component library."))
  }, [])

  // Drag-to-canvas needs the insert URL synchronously (drag data can't be a promise), so
  // pre-create every visible component's code file up front instead of waiting for a click.
  // Locked Pro components (isPro not yet true) are deliberately skipped — their source only
  // ever reaches the client via the gated get-component-source function, and only once the
  // caller is actually on the Pro plan, so they never become draggable for a free user.
  useEffect(() => {
    if (!components || isPro === null) return
    components.forEach((c) => {
      if (c.is_pro && !isPro) return
      fetchComponentSource(c.id).then((src) => {
        if (!src) return
        warmInsertUrl(src.file_name, src.tsx_source).then((url) => {
          if (url) setWarmedFiles((prev) => new Set(prev).add(c.file_name))
        })
      })
    })
  }, [components, isPro])

  const categories = useMemo(() => {
    if (!components) return ["All"]
    return ["All", ...Array.from(new Set(components.map((c) => c.category)))]
  }, [components])

  const categoryCounts = useMemo(() => {
    if (!components) return []
    const counts = new Map<string, number>()
    for (const c of components) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return Array.from(counts.entries())
  }, [components])

  const items = useMemo(() => {
    if (!components) return []
    const term = searchTerm.toLowerCase()
    return components.filter((c) => {
      const matchesCat = activeCategory === "All" || c.category === activeCategory
      const matchesSearch = c.name.toLowerCase().includes(term)
      return matchesCat && matchesSearch
    })
  }, [components, activeCategory, searchTerm])

  async function handleInsert(component: ComponentRow) {
    setBusyId(component.id)
    try {
      const src = await fetchComponentSource(component.id)
      if (!src) throw new Error("Upgrade to Pro to insert this component")
      await insertComponent(src.file_name, src.tsx_source)
      showToast(`Inserted "${component.name}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't insert — try again"
      showToast(message)
      console.error(err)
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpgradeClick() {
    try {
      await startCheckout()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't start checkout — try again")
    }
  }

  let toastTimer: ReturnType<typeof setTimeout>
  function showToast(text: string) {
    setToast(text)
    clearTimeout(toastTimer)
    const duration = text.length > 40 ? 6000 : 1400
    toastTimer = setTimeout(() => setToast(null), duration)
  }

  return (
    <div className="app">
      {screen === "tiles" ? (
        <>
          <div className="greeting">
            <div className="greeting-title">Hey, {greetingName}</div>
            <div className="greeting-subtitle">What will you build today?</div>
          </div>

          <div className="tiles">
            <button
              className="tile tile-browse"
              onClick={() => {
                setActiveCategory("All")
                setScreen("browse")
              }}
            >
              <div className="tile-icon">✨</div>
              <div className="tile-name">Browse all</div>
              <div className="tile-count">{components ? `${components.length} components` : "…"}</div>
            </button>

            {categoryCounts.map(([category, count]) => (
              <button
                key={category}
                className="tile"
                onClick={() => {
                  setActiveCategory(category)
                  setScreen("browse")
                }}
              >
                <div className="tile-icon">{categoryIcon(category)}</div>
                <div className="tile-name">{category}</div>
                <div className="tile-count">{count} components</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="browse-header">
            <button className="browse-back" onClick={() => setScreen("tiles")}>
              ‹ Home
            </button>
            <span className="browse-title">{activeCategory === "All" ? "All components" : activeCategory}</span>
          </div>

          <div className="header">
            <input
              className="search"
              placeholder="Search components…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="categories">
            {categories.map((c) => (
              <button
                key={c}
                className={`cat-btn ${c === activeCategory ? "active" : ""}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="list">
            {loadError ? (
              <div className="empty">{loadError}</div>
            ) : !components ? (
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="card skeleton" />)
            ) : items.length === 0 ? (
              <div className="empty">No components match your search.</div>
            ) : (
              items.map((c) => (
                <GalleryCard
                  key={c.id}
                  component={c}
                  busy={busyId === c.id}
                  locked={!!(c.is_pro && isPro === false)}
                  warmed={warmedFiles.has(c.file_name)}
                  onOpenDetail={() => setDetailComponent(c)}
                  onSave={() => setSavingComponent(c)}
                />
              ))
            )}
          </div>
        </>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>

      {savingComponent && (
        <SaveDrawer
          componentId={savingComponent.id}
          componentName={savingComponent.name}
          onClose={() => setSavingComponent(null)}
        />
      )}

      {detailComponent && (
        <ComponentDetail
          component={detailComponent}
          busy={busyId === detailComponent.id}
          locked={detailComponent.is_pro && isPro === false}
          onClose={() => setDetailComponent(null)}
          onInsert={() => handleInsert(detailComponent)}
          onUpgrade={handleUpgradeClick}
          onSave={() => {
            setSavingComponent(detailComponent)
            setDetailComponent(null)
          }}
        />
      )}
    </div>
  )
}

/** Drag is attached only to the preview thumbnail via a ref, not the whole card — wrapping the
 * entire card (footer, badges, buttons and all) in Framer's <Draggable> caused the rest of the
 * card to visually collapse a few seconds after it became draggable (name/footer disappearing,
 * card shrinking) for reasons that live inside Framer's own closed-source drag setup. Scoping
 * the ref to just the thumbnail keeps whatever that side effect is contained to a disposable
 * sub-element instead of the card's real content — and matches how people expect to drag a
 * thumbnail anyway, not by grabbing the label underneath it. */
function GalleryCard({
  component,
  busy,
  locked,
  warmed,
  onOpenDetail,
  onSave,
}: {
  component: ComponentRow
  busy: boolean
  locked: boolean
  warmed: boolean
  onOpenDetail: () => void
  onSave: () => void
}) {
  const previewRef = useRef<HTMLDivElement>(null)

  useMakeDraggable(previewRef, () => ({
    type: "componentInstance",
    url: getCachedInsertUrl(component.file_name) ?? "",
    name: component.name,
  }))

  return (
    <div className={`card ${busy ? "busy" : ""} ${locked ? "locked" : ""}`} onClick={onOpenDetail}>
      <div className="preview-wrap">
        <div ref={previewRef} className="preview" dangerouslySetInnerHTML={{ __html: component.preview_svg }} />
        {locked && (
          <div className="preview-lock">
            <div className="preview-lock-icon">🔒</div>
          </div>
        )}
      </div>
      <button
        className="save-btn"
        title="Save to boards"
        onClick={(e) => {
          e.stopPropagation()
          onSave()
        }}
      >
        🔖 Save
      </button>
      <div className="card-footer">
        <span className="card-name">
          {component.name}
          {component.is_pro && <span className="pro-badge">PRO</span>}
        </span>
        {locked ? (
          <span className="locked-hint">Tap to unlock</span>
        ) : busy ? (
          <span className="insert-hint">Inserting…</span>
        ) : (
          warmed && <DragHandleIcon />
        )}
      </div>
    </div>
  )
}

function ComponentDetail({
  component,
  busy,
  locked,
  onClose,
  onInsert,
  onUpgrade,
  onSave,
}: {
  component: ComponentRow
  busy: boolean
  locked: boolean
  onClose: () => void
  onInsert: () => void
  onUpgrade: () => void
  onSave: () => void
}) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer detail-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="detail-preview-wrap">
          <div className="detail-preview" dangerouslySetInnerHTML={{ __html: component.preview_svg }} />
          {locked && (
            <div className="preview-lock detail-preview-lock">
              <div className="preview-lock-icon">🔒</div>
            </div>
          )}
        </div>
        <div className="detail-title-row">
          <span className="drawer-title">{component.name}</span>
          {component.is_pro && <span className="pro-badge">PRO</span>}
        </div>
        <div className="detail-category">{component.category}</div>

        {locked ? (
          <>
            <div className="detail-actions">
              <button className="detail-save-btn" onClick={onSave}>
                🔖 Save
              </button>
              <button className="detail-insert-btn detail-upgrade-btn" onClick={onUpgrade}>
                Upgrade to Pro →
              </button>
            </div>
            <div className="detail-hint">This is a Pro component — upgrade to insert it.</div>
          </>
        ) : (
          <>
            <div className="detail-actions">
              <button className="detail-save-btn" onClick={onSave}>
                🔖 Save
              </button>
              <button className="detail-insert-btn" onClick={onInsert} disabled={busy}>
                {busy ? "Inserting…" : "Insert"}
              </button>
            </div>
            <div className="detail-hint">Or drag the card straight onto the canvas.</div>
          </>
        )}

        <button className="drawer-done" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
