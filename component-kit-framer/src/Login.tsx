import { useState } from "react"
import { signIn, signUp, signInWithGoogle, completeGoogleSignIn } from "./lib/auth"
import type { User } from "@supabase/supabase-js"

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setBusy(true)
    try {
      const { url, error: startError } = await signInWithGoogle()
      if (startError || !url) {
        setError(startError ?? "Couldn't start Google sign-in — try again.")
        setBusy(false)
        return
      }

      const popup = window.open(url, "_blank")

      // BroadcastChannel, not window.opener.postMessage — Google's own sign-in page sets a
      // Cross-Origin-Opener-Policy that severs window.opener on the popup, so that channel
      // isn't reliable here even though this tab did open it.
      const channel = new BroadcastChannel("skela-oauth")
      channel.onmessage = (event) => {
        clearInterval(watchClosed)
        channel.close()
        completeGoogleSignIn(event.data.accessToken, event.data.refreshToken).then((result) => {
          setBusy(false)
          if (result.error) {
            setError(result.error)
            return
          }
          if (result.user) onLoggedIn(result.user)
        })
      }

      // The popup closing without ever posting a session back (user closed it, or cancelled
      // at Google) shouldn't leave the button stuck on "…" forever.
      const watchClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(watchClosed)
          channel.close()
          setBusy(false)
        }
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.")
      setBusy(false)
    }
  }

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

      <button className="login-google-btn" type="button" onClick={handleGoogleSignIn} disabled={busy}>
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="login-divider">
        <span>or</span>
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
