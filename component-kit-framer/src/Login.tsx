import { useState } from "react"
import { signIn, signUp } from "./lib/auth"
import type { User } from "@supabase/supabase-js"

export default function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password)

    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }
    if (result.user) {
      onLoggedIn(result.user)
    } else if (mode === "signup") {
      setError("Check your email to confirm your account, then sign in.")
    }
  }

  return (
    <div className="login">
      <div className="brand">
        <div className="brand-mark">CK</div>
        <div className="brand-name">Component Kit</div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
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
