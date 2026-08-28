import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { insertComponent } from "./nodeBuilders"
import { restoreSession, signOut } from "./lib/auth"
import { getData, setDataInBackground } from "./lib/pluginStorage"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { getOnboardingStatus } from "./lib/profile"
import Login from "./Login"
import Onboarding from "./Onboarding"

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
    const done = await getOnboardingStatus(loggedInUser.id)
    setNeedsOnboarding(!done)
  }

  if (checkingSession) {
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

  return <Gallery user={user} onLogOut={() => setUser(null)} theme={theme} onToggleTheme={toggle} />
}

function Gallery({
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
  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetchComponents()
      .then(setComponents)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the component library."))
  }, [])

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
      <div className="header">
        <div className="brand">
          <div className="brand-mark">CK</div>
          <div className="brand-name">Component Kit</div>
          <button className="theme-btn" title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            className="logout-btn"
            title={user.email ?? "Account"}
            onClick={async () => {
              await signOut()
              onLogOut()
            }}
          >
            Log out
          </button>
        </div>
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
          items.map((c) => (
            <div key={c.id} className={`card ${busyId === c.id ? "busy" : ""}`} onClick={() => handleInsert(c)}>
              <div className="preview" dangerouslySetInnerHTML={{ __html: c.preview_svg }} />
              <div className="card-footer">
                <span className="card-name">
                  {c.name}
                  {c.is_pro && <span className="pro-badge">PRO</span>}
                </span>
                <span className="insert-hint">{busyId === c.id ? "Inserting…" : "Insert →"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
