import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useMakeDraggable } from "@framer/plugin"
import { insertComponent, insertFromModuleUrl, warmInsertUrl, getCachedInsertUrl } from "./nodeBuilders"
import { restoreSession } from "./lib/auth"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { fetchComponentSource } from "./lib/componentSource"
import { sanitizePreviewSvg } from "./lib/sanitizeSvg"
import { getProStatus } from "./lib/payments"
import { fetchAppSettings } from "./lib/appSettings"
import { isSuperAdminEmail } from "./lib/admin"
import ProDrawer from "./ProDrawer"
import FeedbackForm from "./FeedbackForm"
import type { FeedbackType } from "./lib/feedback"
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
  MessageIcon,
  BugIcon,
  HomeGridIcon,
  CrownIcon,
  CheckIcon,
  ChevronDownIcon,
  categoryIconFor,
  sectionIconFor,
} from "./icons"

type Section = "part" | "panel" | "page"
const SECTIONS: Section[] = ["part", "panel", "page"]
const SECTION_LABELS: Record<Section, string> = { part: "Parts", panel: "Panels", page: "Pages" }
// A distinct accent hue per section on Home's tiles — purely a visual differentiator between
// the three tiles, unrelated to --accent (interactive) or --pro (locked) meanings elsewhere.
const SECTION_BADGE_STYLE: Record<Section, { background: string; color: string }> = {
  part: { background: "hsl(235 70% 65% / 18%)", color: "hsl(235 80% 78%)" },
  panel: { background: "hsl(265 70% 65% / 18%)", color: "hsl(265 80% 80%)" },
  page: { background: "hsl(35 85% 60% / 18%)", color: "hsl(35 90% 72%)" },
}

// Home's card decorations are fixed generic wireframe line-art, not derived from any real
// component's own preview_svg — exact port of the mockup's per-card BP.* SVGs, so every card
// always shows a decoration regardless of whether real catalog data has preview art yet.
const HOME_BLUEPRINTS: Record<"hero" | Section | "promo", string> = {
  hero: `<svg viewBox="0 0 100 74" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="34" height="34" rx="4"/><circle cx="66" cy="16" r="12"/><rect x="4" y="46" width="60" height="6" rx="3"/><rect x="4" y="58" width="40" height="6" rx="3"/><path d="M78 46h18v18H78Z"/></svg>`,
  part: `<svg viewBox="0 0 100 74" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="38" height="26" rx="3"/><rect x="52" y="8" width="42" height="14" rx="3"/><rect x="52" y="28" width="42" height="6" rx="3"/><rect x="6" y="44" width="88" height="24" rx="3"/></svg>`,
  panel: `<svg viewBox="0 0 90 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="82" height="20" rx="3"/><rect x="4" y="30" width="82" height="12" rx="3"/><rect x="4" y="48" width="50" height="12" rx="3"/></svg>`,
  page: `<svg viewBox="0 0 90 70" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="82" height="62" rx="6"/><path d="M20 50V20M20 20l-6 6M20 20l6 6" /><rect x="40" y="18" width="34" height="6" rx="3"/><rect x="40" y="30" width="24" height="6" rx="3"/></svg>`,
  promo: `<svg viewBox="0 0 100 74" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="60" height="14" rx="3"/><rect x="4" y="24" width="40" height="6" rx="3"/><circle cx="80" cy="40" r="16"/></svg>`,
}

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
  // Defaults to "dark" — the brand's primary look — for anyone with no saved preference yet.
  // A saved preference (from the toggle below) always wins over this default.
  //
  // localStorage, not framer.setPluginData: that API is project-level storage shared between
  // every collaborator on the project (confirmed against Framer's own docs), so a personal
  // theme preference would reset per-project and leak to other people editing the same file.
  // localStorage is per-plugin-origin and private to this browser/user.
  const [theme, setTheme] = useState<ThemePref>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      return saved === "dark" || saved === "light" ? saved : "dark"
    } catch {
      return "dark"
    }
  })

  // useLayoutEffect, not useEffect: the default is now "dark" while :root's own unqualified CSS
  // still defaults to light, so this has to land before the browser paints the first frame —
  // useEffect fires after paint and would flash light first.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch (err) {
        console.warn("Failed to persist theme preference:", err)
      }
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
      // Falls back to the already-correct "no session" state (Login screen) either way — this
      // just stops a transient failure here from becoming an unhandled rejection.
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false))
  }, [])

  async function handleLoggedIn(loggedInUser: User) {
    setUser(loggedInUser)
    setCheckingOnboarding(true)
    try {
      const done = await getOnboardingStatus(loggedInUser.id)
      setNeedsOnboarding(!done)
    } catch {
      // Unknown onboarding status — default to showing it. Worse case is a returning user sees
      // it again after a network blip; the alternative (silently skipping a real first-timer's
      // onboarding) is worse and was the actual gap here.
      setNeedsOnboarding(true)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  if (checkingSession || checkingOnboarding) {
    return (
      <div className="app">
        <div className="boot-loading">
          <div className="boot-loading-mark">
            <SparkleIcon />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLoggedIn={handleLoggedIn} />
  }

  if (needsOnboarding) {
    return <Onboarding user={user} onDone={() => setNeedsOnboarding(false)} />
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
  const [buildSection, setBuildSection] = useState<Section | null>(null)

  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [warmedFiles, setWarmedFiles] = useState<Set<string>>(new Set())
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [proAvailable, setProAvailable] = useState<boolean | null>(null)
  const [uiOpacity, setUiOpacity] = useState(1)
  const isSuperAdmin = isSuperAdminEmail(user.email)

  useEffect(() => {
    fetchAppSettings()
      .then((s) => {
        setProAvailable(s.proAvailable)
        setUiOpacity(s.uiOpacity)
      })
      .catch(() => setProAvailable(true))
  }, [])

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

  function refetchComponents() {
    fetchComponents()
      .then(setComponents)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the component library."))
  }

  useEffect(() => {
    refetchComponents()
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
      // module_url components are always ready to drag immediately — their insert URL is
      // already known synchronously from the row itself, nothing to warm.
      if (c.module_url) return
      fetchComponentSource(c.id).then((src) => {
        if (!src) return
        warmInsertUrl(src.file_name, src.tsx_source).then((url) => {
          if (url) setWarmedFiles((prev) => new Set(prev).add(c.file_name!))
        })
      })
    })
  }, [components, isPro])

  function openBuild(category: string | null = null, section: Section | null = null) {
    setBuildCategory(category)
    setBuildSection(section)
    setView("build")
  }

  // Spells S-K-E-L-A across the nav, left to right — Home/Build/Boards/Colors/Settings.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement
      const tag = (active?.tagName ?? "").toLowerCase()
      if (tag === "input" || tag === "textarea" || (active instanceof HTMLElement && active.isContentEditable)) return
      switch (e.key.toLowerCase()) {
        case "s":
          setView("home")
          break
        case "k":
          openBuild()
          break
        case "e":
          setView("boards")
          break
        case "l":
          setView("colors")
          break
        case "a":
          setView("settings")
          break
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="shell" style={{ opacity: isSuperAdmin ? 1 : uiOpacity }}>
      <div className="shell-content">
        {view === "home" && (
          <Home
            user={user}
            components={components}
            isPro={isPro}
            proAvailable={proAvailable}
            onOpenAll={() => openBuild()}
            onOpenSection={(section) => openBuild(null, section)}
          />
        )}
        {view === "build" && (
          <Browse
            components={components}
            loadError={loadError}
            isPro={isPro}
            proAvailable={proAvailable}
            warmedFiles={warmedFiles}
            initialCategory={buildCategory}
            initialSection={buildSection}
          />
        )}
        {view === "boards" && <Boards />}
        {view === "colors" && <Colors />}
        {view === "settings" && (
          <Settings
            user={user}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onLogOut={onLogOut}
            onComponentsChanged={refetchComponents}
            proAvailable={proAvailable}
            onProAvailableChanged={setProAvailable}
            isSuperAdmin={isSuperAdmin}
            uiOpacity={uiOpacity}
            onUiOpacityChanged={setUiOpacity}
          />
        )}
      </div>
      <div className="bottom-nav">
        <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
          <span className="nav-key-hint">S</span>
          <HomeIcon />
          <span>Home</span>
        </button>
        <button className={`nav-btn ${view === "build" ? "active" : ""}`} onClick={() => openBuild()}>
          <span className="nav-key-hint">K</span>
          <LayersIcon />
          <span>Build</span>
        </button>
        <button className={`nav-btn ${view === "boards" ? "active" : ""}`} onClick={() => setView("boards")}>
          <span className="nav-key-hint">E</span>
          <BookmarkIcon />
          <span>Boards</span>
        </button>
        <button className={`nav-btn ${view === "colors" ? "active" : ""}`} onClick={() => setView("colors")}>
          <span className="nav-key-hint">L</span>
          <PaletteIcon />
          <span>Colors</span>
        </button>
        <button className={`nav-btn ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <span className="nav-key-hint">A</span>
          <SettingsIcon />
          {isPro && <span className="nav-pro-dot" />}
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

function Home({
  user,
  components,
  isPro,
  proAvailable,
  onOpenAll,
  onOpenSection,
}: {
  user: User
  components: ComponentRow[] | null
  isPro: boolean | null
  proAvailable: boolean | null
  onOpenAll: () => void
  onOpenSection: (section: Section) => void
}) {
  const [showProDrawer, setShowProDrawer] = useState(false)
  const [showFeedback, setShowFeedback] = useState<FeedbackType | null>(null)

  const [greetingName, setGreetingName] = useState<string>(user.email ? friendlyNameFromEmail(user.email) : "there")

  useEffect(() => {
    getFullName(user.id).then((name) => {
      if (name) setGreetingName(name)
    })
  }, [user.id])

  const sectionCounts = useMemo(() => {
    if (!components) return []
    const counts = new Map<Section, number>()
    for (const c of components) {
      if (c.section) counts.set(c.section, (counts.get(c.section) ?? 0) + 1)
    }
    return SECTIONS.map((s) => [s, counts.get(s) ?? 0] as const)
  }, [components])

  if (showFeedback) {
    return <FeedbackForm user={user} type={showFeedback} onBack={() => setShowFeedback(null)} />
  }

  return (
    <div className="app">
      {/* Everything (greeting + tiles + promo) lives in one flat scrollable region, matching
          Kompa's actual structure (inspected live) — only its bottom nav sits outside the
          scroll area. Splitting a fixed header from a separately-scrolling body (our previous
          approach: two nested flex regions, one with overflow-y:auto) did not reliably scroll
          in this host despite textbook-correct CSS at every layer, confirmed via a live debug
          banner over several rounds. A single flat scrollable container has no such nesting
          and is the proven-working pattern. */}
      <div className="home-scroll">
        <div className="greeting">
          <div className="greeting-title">Hey, {greetingName}</div>
          <div className="greeting-subtitle">What will you build today?</div>
        </div>

        <div className="tiles">
          <button className="tile tile-hero b6" onClick={onOpenAll}>
            <div className="blueprint" dangerouslySetInnerHTML={{ __html: HOME_BLUEPRINTS.hero }} />
            <div className="tile-badge">
              <HomeGridIcon />
            </div>
            <svg className="tile-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
            <div className="tile-name">Browse all</div>
            <div className="tile-count">{components ? `${components.length} components` : "…"}</div>
          </button>

          {sectionCounts.map(([section, count]) => {
            const SectionIcon = sectionIconFor(section)
            return (
              <button key={section} className="tile tile-small b2" onClick={() => onOpenSection(section)}>
                <div className="blueprint" dangerouslySetInnerHTML={{ __html: HOME_BLUEPRINTS[section] }} />
                <div className="tile-badge" style={SECTION_BADGE_STYLE[section]}>
                  <SectionIcon />
                </div>
                <div className="tile-text">
                  <div className="tile-name">{SECTION_LABELS[section]}</div>
                  <div className="tile-count">{count} components</div>
                </div>
              </button>
            )
          })}
        </div>

        {isPro === false && (
          <div className="promo">
            <div className="blueprint" dangerouslySetInnerHTML={{ __html: HOME_BLUEPRINTS.promo }} />
            <span className="promo-badge">
              <span>{proAvailable === false ? "SOON" : "PRO"}</span>
            </span>
            <h3>{proAvailable === false ? "Pro is coming soon" : "Unlock every component"}</h3>
            <p>
              {proAvailable === false
                ? "We're building out the Pro component library — check back soon."
                : "Pro components, saved boards, and the color tool — all in one plan."}
            </p>
            <button className="promo-btn" onClick={() => setShowProDrawer(true)}>
              {proAvailable === false ? "Coming soon" : "Upgrade to Pro"}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {showProDrawer && <ProDrawer proAvailable={proAvailable} onClose={() => setShowProDrawer(false)} />}

        <div className="home-section-label">Feedback</div>
        <div className="home-feedback-row">
          <button className="home-feedback-btn" onClick={() => setShowFeedback("feedback")}>
            <MessageIcon />
            Send feedback
          </button>
          <button className="home-feedback-btn" onClick={() => setShowFeedback("bug")}>
            <BugIcon />
            Report a bug
          </button>
        </div>
      </div>
    </div>
  )
}

function Browse({
  components,
  loadError,
  isPro,
  proAvailable,
  warmedFiles,
  initialCategory,
  initialSection,
}: {
  components: ComponentRow[] | null
  loadError: string | null
  isPro: boolean | null
  proAvailable: boolean | null
  warmedFiles: Set<string>
  initialCategory: string | null
  initialSection: Section | null
}) {
  const allCategories = useMemo(
    () => (components ? Array.from(new Set(components.map((c) => c.category))) : []),
    [components]
  )

  const [selectedSection, setSelectedSection] = useState<Section | null>(initialSection)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(initialCategory ? [initialCategory] : allCategories)
  )
  const [selectedAccess, setSelectedAccess] = useState<Set<"free" | "pro">>(new Set(["free", "pro"]))
  const [sortRecent, setSortRecent] = useState(false)
  const activeFilterCount =
    (selectedCategories.size < allCategories.length ? 1 : 0) + (selectedAccess.size < 2 ? 1 : 0) + (sortRecent ? 1 : 0)
  const [openFilterGroup, setOpenFilterGroup] = useState<"category" | "access" | "sort" | null>(null)
  const [categorySearch, setCategorySearch] = useState("")
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
  const [showProDrawer, setShowProDrawer] = useState(false)

  // Re-seed the category filter whenever the caller opens Browse with a different starting
  // category (e.g. tapping a different Home tile, or the bottom-nav Build tab for "all").
  useEffect(() => {
    setSelectedCategories(new Set(initialCategory ? [initialCategory] : allCategories))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory])

  useEffect(() => {
    setSelectedSection(initialSection)
  }, [initialSection])

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
    const filtered = components.filter((c) => {
      const matchesSection = selectedSection === null || c.section === selectedSection
      const matchesCat = selectedCategories.size === 0 || selectedCategories.has(c.category)
      const matchesAccess = selectedAccess.has(c.is_pro ? "pro" : "free")
      const matchesSearch = c.name.toLowerCase().includes(term)
      return matchesSection && matchesCat && matchesAccess && matchesSearch
    })
    if (!sortRecent) return filtered
    return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [components, selectedSection, selectedCategories, selectedAccess, searchTerm, sortRecent])

  async function handleInsert(component: ComponentRow) {
    setBusyId(component.id)
    try {
      if (component.module_url) {
        await insertFromModuleUrl(component.module_url)
      } else {
        const src = await fetchComponentSource(component.id)
        if (!src) throw new Error("Upgrade to Pro to insert this component")
        await insertComponent(src.file_name, src.tsx_source)
      }
      showToast(`Inserted "${component.name}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't insert — try again"
      showToast(message)
      console.error(err)
    } finally {
      setBusyId(null)
    }
  }

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(text: string) {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    const duration = text.length > 40 ? 6000 : 1400
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }

  return (
    <div className="app">
      <div className="browse-header">
        <div className="section-tabs">
          <button className={`section-tab ${selectedSection === null ? "active" : ""}`} onClick={() => setSelectedSection(null)}>
            All
          </button>
          {SECTIONS.map((s) => (
            <button key={s} className={`section-tab ${selectedSection === s ? "active" : ""}`} onClick={() => setSelectedSection(s)}>
              {SECTION_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="browse-header-actions">
          <button
            className={`icon-btn ${filtersOpen ? "active" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
            title="Filter"
            onClick={() => {
              setFiltersOpen((v) => !v)
              setSearchOpen(false)
            }}
          >
            <SlidersIcon />
          </button>
          <button
            className={`icon-btn ${searchOpen ? "active" : ""}`}
            title="Search"
            onClick={() => (searchOpen ? closeSearch() : (setSearchOpen(true), setFiltersOpen(false)))}
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="bx-search-row">
          <input
            ref={searchInputRef}
            placeholder="Search components…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
          />
        </div>
      )}

      {filtersOpen && (
        <div className="bx-filter-wrap">
          <button
            className={`bx-filter-chip ${selectedCategories.size < allCategories.length ? "active" : ""}`}
            onClick={() => setOpenFilterGroup(openFilterGroup === "category" ? null : "category")}
          >
            Categories <ChevronDownIcon />
          </button>
          <button
            className={`bx-filter-chip ${selectedAccess.size < 2 ? "active" : ""}`}
            onClick={() => setOpenFilterGroup(openFilterGroup === "access" ? null : "access")}
          >
            Access <ChevronDownIcon />
          </button>
          <button
            className={`bx-filter-chip ${sortRecent ? "active" : ""}`}
            onClick={() => setOpenFilterGroup(openFilterGroup === "sort" ? null : "sort")}
          >
            Sort <ChevronDownIcon />
          </button>
        </div>
      )}

      {filtersOpen && openFilterGroup && (
        <div className="filter-row-wrap">
          <div className="filter-dropdown-backdrop" onClick={() => setOpenFilterGroup(null)} />
          <div className="filter-dropdown">
            {openFilterGroup === "category" && (
              <>
                <input
                  className="bx-dropdown-search"
                  placeholder="Search categories…"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                {allCategories
                  .filter((cat) => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map((cat) => {
                    const CatIcon = categoryIconFor(cat)
                    return (
                      <label key={cat} className={`filter-option ${selectedCategories.has(cat) ? "checked" : ""}`}>
                        <input type="checkbox" checked={selectedCategories.has(cat)} onChange={() => toggleCategory(cat)} />
                        <CatIcon />
                        <span style={{ flex: 1 }}>{cat}</span>
                        <span className="filter-check">{selectedCategories.has(cat) && <CheckIcon />}</span>
                      </label>
                    )
                  })}
              </>
            )}
            {openFilterGroup === "access" &&
              (["free", "pro"] as const).map((access) => (
                <label key={access} className={`filter-option ${selectedAccess.has(access) ? "checked" : ""}`}>
                  <input type="checkbox" checked={selectedAccess.has(access)} onChange={() => toggleAccess(access)} />
                  <span style={{ flex: 1 }}>{access === "free" ? "Free" : "Pro"}</span>
                  <span className="filter-check">{selectedAccess.has(access) && <CheckIcon />}</span>
                </label>
              ))}
            {openFilterGroup === "sort" && (
              <label className={`filter-option ${sortRecent ? "checked" : ""}`}>
                <input type="checkbox" checked={sortRecent} onChange={() => setSortRecent((v) => !v)} />
                <span style={{ flex: 1 }}>Newest first</span>
                <span className="filter-check">{sortRecent && <CheckIcon />}</span>
              </label>
            )}
          </div>
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
              proAvailable={proAvailable}
              warmed={!!c.module_url || warmedFiles.has(c.file_name ?? "")}
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
          proAvailable={proAvailable}
          onClose={() => setDetailComponent(null)}
          onInsert={() => handleInsert(detailComponent)}
          onUpgrade={() => setShowProDrawer(true)}
          onSave={() => {
            setSavingComponent(detailComponent)
            setDetailComponent(null)
          }}
        />
      )}

      {showProDrawer && <ProDrawer proAvailable={proAvailable} onClose={() => setShowProDrawer(false)} />}
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
  proAvailable,
  warmed,
  onOpenDetail,
  onSave,
}: {
  component: ComponentRow
  busy: boolean
  locked: boolean
  proAvailable: boolean | null
  warmed: boolean
  onOpenDetail: () => void
  onSave: () => void
}) {
  const previewRef = useRef<HTMLDivElement>(null)

  useMakeDraggable(previewRef, () => ({
    type: "componentInstance",
    url: component.module_url ?? getCachedInsertUrl(component.file_name ?? "") ?? "",
    name: component.name,
  }))

  const CategoryIcon = categoryIconFor(component.category)

  return (
    <div className={`card ${busy ? "busy" : ""} ${locked ? "locked" : ""}`} onClick={onOpenDetail}>
      <div className="preview-wrap">
        {component.preview_image_url ? (
          <div ref={previewRef} className="preview">
            <img src={component.preview_image_url} alt="" />
          </div>
        ) : component.preview_svg ? (
          <div ref={previewRef} className="preview" dangerouslySetInnerHTML={{ __html: sanitizePreviewSvg(component.preview_svg) }} />
        ) : (
          <div ref={previewRef} className="preview preview-fallback">
            <CategoryIcon />
          </div>
        )}
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
          {locked ? (
            <span className="locked-hint">{proAvailable === false ? "Coming soon" : "Tap to unlock"}</span>
          ) : busy ? (
            <span className="insert-hint">Inserting…</span>
          ) : (
            warmed && <DragHandleIcon />
          )}
        </span>
        {component.is_pro ? (
          <span className="pro-badge">
            <CrownIcon />
            {proAvailable === false ? "Soon" : "Pro"}
          </span>
        ) : (
          <span className="badge-free">Free</span>
        )}
      </div>
    </div>
  )
}

function ComponentDetail({
  component,
  busy,
  locked,
  proAvailable,
  onClose,
  onInsert,
  onUpgrade,
  onSave,
}: {
  component: ComponentRow
  busy: boolean
  locked: boolean
  proAvailable: boolean | null
  onClose: () => void
  onInsert: () => void
  onUpgrade: () => void
  onSave: () => void
}) {
  const CategoryIcon = categoryIconFor(component.category)

  return (
    <div className="bx-detail-screen">
      <button className="bx-detail-back" onClick={onClose}>
        <span>‹</span> Back
      </button>
      <div className="bx-detail-scroll">
        <div className="greeting" style={{ paddingBottom: 6 }}>
          <div className="greeting-title">{component.name}</div>
          <div className="greeting-subtitle">
            {component.category}
            {component.is_pro && (
              <span className="pro-badge" style={{ marginLeft: 8 }}>
                <CrownIcon />
                {proAvailable === false ? "Soon" : "Pro"}
              </span>
            )}
          </div>
        </div>
        <div className="bx-detail-preview-wrap">
          {component.preview_image_url ? (
            <div className="bx-detail-preview">
              <img src={component.preview_image_url} alt="" />
            </div>
          ) : component.preview_svg ? (
            <div className="bx-detail-preview" dangerouslySetInnerHTML={{ __html: sanitizePreviewSvg(component.preview_svg) }} />
          ) : (
            <div className="bx-detail-preview preview-fallback">
              <CategoryIcon />
            </div>
          )}
          <div className="bx-detail-fade" />
          {locked && (
            <div className="preview-lock">
              <div className="preview-lock-icon"><LockIcon /></div>
            </div>
          )}
        </div>
      </div>

      <div className="bx-detail-actions">
        {locked ? (
          <button className="bx-insert-block" onClick={onUpgrade}>
            {proAvailable === false ? "Coming soon" : "Upgrade to Pro →"}
          </button>
        ) : (
          <button className="bx-insert-block" onClick={onInsert} disabled={busy}>
            {busy ? "Inserting…" : "Insert"}
          </button>
        )}
        <button className="bx-save-icon" onClick={onSave} title="Save to boards">
          <BookmarkIcon />
        </button>
      </div>
    </div>
  )
}
