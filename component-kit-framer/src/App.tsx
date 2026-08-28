import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Draggable } from "@framer/plugin"
import { insertComponent, warmInsertUrl, getCachedInsertUrl } from "./nodeBuilders"
import { restoreSession } from "./lib/auth"
import { getData, setDataInBackground } from "./lib/pluginStorage"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { getOnboardingStatus, getFullName, friendlyNameFromEmail } from "./lib/profile"
import Login from "./Login"
import Onboarding from "./Onboarding"
import Settings from "./Settings"
import Boards from "./Boards"
import SaveDrawer from "./SaveDrawer"

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
  const [view, setView] = useState<"home" | "boards" | "settings">("home")

  return (
    <div className="shell">
      <div className="shell-content">
        {view === "home" && <Gallery user={user} />}
        {view === "boards" && <Boards />}
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
  const [greetingName, setGreetingName] = useState<string>(user.email ? friendlyNameFromEmail(user.email) : "there")
  const [warmedFiles, setWarmedFiles] = useState<Set<string>>(new Set())

  useEffect(() => {
    getFullName(user.id).then((name) => {
      if (name) setGreetingName(name)
    })
  }, [user.id])

  useEffect(() => {
    fetchComponents()
      .then(setComponents)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the component library."))
  }, [])

  // Drag-to-canvas needs the insert URL synchronously (drag data can't be a promise), so
  // pre-create every visible component's code file up front instead of waiting for a click.
  useEffect(() => {
    if (!components) return
    components.forEach((c) => {
      warmInsertUrl(c.file_name, c.tsx_source).then((url) => {
        if (url) setWarmedFiles((prev) => new Set(prev).add(c.file_name))
      })
    })
  }, [components])

  const categories = useMemo(() => {
    if (!components) return ["All"]
    return ["All", ...Array.from(new Set(components.map((c) => c.category)))]
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
      await insertComponent(component.file_name, component.tsx_source)
      showToast(`Inserted "${component.name}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't insert — try again"
      showToast(message)
      console.error(err)
    } finally {
      setBusyId(null)
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
      <div className="greeting">
        <div className="greeting-title">Hey, {greetingName}</div>
        <div className="greeting-subtitle">What will you build today?</div>
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

      <div className="grid">
        {loadError ? (
          <div className="empty">{loadError}</div>
        ) : !components ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="card skeleton" />)
        ) : items.length === 0 ? (
          <div className="empty">No components match your search.</div>
        ) : (
          items.map((c) => {
            const card = (
              <div className={`card ${busyId === c.id ? "busy" : ""}`} onClick={() => handleInsert(c)}>
                <div className="preview" dangerouslySetInnerHTML={{ __html: c.preview_svg }} />
                <button
                  className="save-btn"
                  title="Save to boards"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSavingComponent(c)
                  }}
                >
                  🔖 Save
                </button>
                <div className="card-footer">
                  <span className="card-name">
                    {c.name}
                    {c.is_pro && <span className="pro-badge">PRO</span>}
                  </span>
                  <span className="insert-hint">
                    {busyId === c.id ? "Inserting…" : warmedFiles.has(c.file_name) ? "Drag or click →" : "Insert →"}
                  </span>
                </div>
              </div>
            )

            if (!warmedFiles.has(c.file_name)) {
              return <div key={c.id}>{card}</div>
            }

            return (
              <Draggable
                key={c.id}
                data={() => ({
                  type: "componentInstance",
                  url: getCachedInsertUrl(c.file_name) ?? "",
                  name: c.name,
                })}
              >
                {card}
              </Draggable>
            )
          })
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
    </div>
  )
}
