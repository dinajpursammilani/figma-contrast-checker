import { useState } from "react"
import { signIn, signUp } from "./lib/auth"
import type { User } from "@supabase/supabase-js"

export default function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password, fullName.trim())

      if (result.error) {
        setError(result.error)
        return
      }
      if (result.user) {
        onLoggedIn(result.user)
      } else if (mode === "signup") {
        setError("Check your email to confirm your account, then sign in.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.")
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <svg className="login-mark" viewBox="0 0 100 100" width="44" height="44">
          <defs>
            <linearGradient id="loginMarkGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6b78ff" />
              <stop offset="100%" stopColor="#3a46e0" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="24" fill="url(#loginMarkGrad)" />
          <text x="50" y="67" fontFamily="Inter, sans-serif" fontSize="42" fontWeight="800" fill="white" textAnchor="middle">
            S
          </text>
        </svg>
        <div className="login-name">Skela</div>
        <div className="login-tagline">Ready-made components for Framer</div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input
            className="search"
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <input
          className="search"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="search"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && <div className="login-error">{error}</div>}

        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Log in" : "Sign up"}
        </button>
      </form>

      <button
        className="login-switch"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin")
          setError(null)
        }}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  )
}
