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
import {
  HomeIcon,
  LayersIcon,
  BookmarkIcon,
  PaletteIcon,
  SettingsIcon,
  SearchIcon,
  SlidersIcon,
  LockIcon,
  SparkleIcon,
  CloseIcon,
  categoryIconFor,
} from "./icons"

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
  const [view, setView] = useState<"home" | "build" | "boards" | "colors" | "settings">("home")
  const [buildCategory, setBuildCategory] = useState<string | null>(null)

  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [warmedFiles, setWarmedFiles] = useState<Set<string>>(new Set())
  const [isPro, setIsPro] = useState<boolean | null>(null)

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

  function openBuild(category: string | null) {
    setBuildCategory(category)
    setView("build")
  }

  return (
    <div className="shell">
      <div className="shell-content">
        {view === "home" && <Home user={user} components={components} onOpenCategory={openBuild} />}
        {view === "build" && (
          <Browse
            components={components}
            loadError={loadError}
            isPro={isPro}
            warmedFiles={warmedFiles}
            initialCategory={buildCategory}
          />
        )}
        {view === "boards" && <Boards />}
        {view === "colors" && <Colors />}
        {view === "settings" && (
          <Settings user={user} theme={theme} onToggleTheme={onToggleTheme} onLogOut={onLogOut} />
        )}
      </div>
      <div className="bottom-nav">
        <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
          <HomeIcon />
          <span>Home</span>
        </button>
        <button className={`nav-btn ${view === "build" ? "active" : ""}`} onClick={() => openBuild(null)}>
          <LayersIcon />
          <span>Build</span>
        </button>
        <button className={`nav-btn ${view === "boards" ? "active" : ""}`} onClick={() => setView("boards")}>
          <BookmarkIcon />
          <span>Boards</span>
        </button>
        <button className={`nav-btn ${view === "colors" ? "active" : ""}`} onClick={() => setView("colors")}>
          <PaletteIcon />
          <span>Colors</span>
        </button>
        <button className={`nav-btn ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

function Home({
  user,
  components,
  onOpenCategory,
}: {
  user: User
  components: ComponentRow[] | null
  onOpenCategory: (category: string | null) => void
}) {
  const [greetingName, setGreetingName] = useState<string>(user.email ? friendlyNameFromEmail(user.email) : "there")

  useEffect(() => {
    getFullName(user.id).then((name) => {
      if (name) setGreetingName(name)
    })
  }, [user.id])

  const categoryCounts = useMemo(() => {
    if (!components) return []
    const counts = new Map<string, number>()
    for (const c of components) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return Array.from(counts.entries())
  }, [components])

  return (
    <div className="app">
      <div className="greeting">
        <div className="greeting-title">Hey, {greetingName}</div>
        <div className="greeting-subtitle">What will you build today?</div>
      </div>

      <div className="tiles">
        <button className="tile tile-browse" onClick={() => onOpenCategory(null)}>
          <div className="tile-icon">
            <SparkleIcon />
          </div>
          <div className="tile-name">Browse all</div>
          <div className="tile-count">{components ? `${components.length} components` : "…"}</div>
        </button>

        {categoryCounts.map(([category, count]) => {
          const CategoryIcon = categoryIconFor(category)
          return (
            <button key={category} className="tile" onClick={() => onOpenCategory(category)}>
              <div className="tile-icon">
                <CategoryIcon />
              </div>
              <div className="tile-name">{category}</div>
              <div className="tile-count">{count} components</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Browse({
  components,
  loadError,
  isPro,
  warmedFiles,
  initialCategory,
}: {
  components: ComponentRow[] | null
  loadError: string | null
  isPro: boolean | null
  warmedFiles: Set<string>
  initialCategory: string | null
}) {
  const allCategories = useMemo(
    () => (components ? Array.from(new Set(components.map((c) => c.category))) : []),
    [components]
  )

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(initialCategory ? [initialCategory] : allCategories)
  )
  const [selectedAccess, setSelectedAccess] = useState<Set<"free" | "pro">>(new Set(["free", "pro"]))
  const [openFilter, setOpenFilter] = useState<"category" | "access" | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  function closeSearch() {
    setSearchOpen(false)
    setSearchTerm("")
  }
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savingComponent, setSavingComponent] = useState<ComponentRow | null>(null)
  const [detailComponent, setDetailComponent] = useState<ComponentRow | null>(null)

  // Re-seed the category filter whenever the caller opens Browse with a different starting
  // category (e.g. tapping a different Home tile, or the bottom-nav Build tab for "all").
  useEffect(() => {
    setSelectedCategories(new Set(initialCategory ? [initialCategory] : allCategories))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory])

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  function toggleAccess(access: "free" | "pro") {
    setSelectedAccess((prev) => {
      const next = new Set(prev)
      next.has(access) ? next.delete(access) : next.add(access)
      return next
    })
  }

  const items = useMemo(() => {
    if (!components) return []
    const term = searchTerm.toLowerCase()
    return components.filter((c) => {
      const matchesCat = selectedCategories.size === 0 || selectedCategories.has(c.category)
      const matchesAccess = selectedAccess.has(c.is_pro ? "pro" : "free")
      const matchesSearch = c.name.toLowerCase().includes(term)
      return matchesCat && matchesAccess && matchesSearch
    })
  }, [components, selectedCategories, selectedAccess, searchTerm])

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
      <div className="browse-header">
        <div className={`search-inline-wrap ${searchOpen ? "open" : ""}`}>
          <input
            ref={searchInputRef}
            className="search-inline-input"
            placeholder="Search components…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
          />
        </div>
        {!searchOpen && <span className="browse-header-spacer" />}
        <button
          className={`icon-btn ${searchOpen ? "active" : ""}`}
          title="Search"
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
        >
          {searchOpen ? <CloseIcon /> : <SearchIcon />}
        </button>
        <button
          className={`icon-btn ${filtersOpen ? "active" : ""}`}
          title="Filter"
          onClick={() => {
            setFiltersOpen((v) => !v)
            setOpenFilter(null)
          }}
        >
          <SlidersIcon />
        </button>
      </div>

      {filtersOpen && (
        <div className="filter-row-wrap">
          <div className="filter-row">
            <button
              className={`filter-chip ${selectedCategories.size < allCategories.length ? "active" : ""}`}
              onClick={() => setOpenFilter(openFilter === "category" ? null : "category")}
            >
              Category
              {selectedCategories.size < allCategories.length && (
                <span className="filter-chip-count">{selectedCategories.size}</span>
              )}
            </button>
            <button
              className={`filter-chip ${selectedAccess.size < 2 ? "active" : ""}`}
              onClick={() => setOpenFilter(openFilter === "access" ? null : "access")}
            >
              Access
              {selectedAccess.size < 2 && <span className="filter-chip-count">{selectedAccess.size}</span>}
            </button>
          </div>

          {openFilter && (
            <>
              <div className="filter-dropdown-backdrop" onClick={() => setOpenFilter(null)} />
              <div className="filter-dropdown">
                {openFilter === "category"
                  ? allCategories.map((cat) => (
                      <label key={cat} className="filter-option">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat)}
                          onChange={() => toggleCategory(cat)}
                        />
                        {cat}
                      </label>
                    ))
                  : (["free", "pro"] as const).map((access) => (
                      <label key={access} className="filter-option">
                        <input
                          type="checkbox"
                          checked={selectedAccess.has(access)}
                          onChange={() => toggleAccess(access)}
                        />
                        {access === "free" ? "Free" : "Pro"}
                      </label>
                    ))}
              </div>
            </>
          )}
        </div>
      )}

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
            <div className="preview-lock-icon"><LockIcon /></div>
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
        <BookmarkIcon /> Save
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
              <div className="preview-lock-icon"><LockIcon /></div>
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
                <BookmarkIcon /> Save
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
                <BookmarkIcon /> Save
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
