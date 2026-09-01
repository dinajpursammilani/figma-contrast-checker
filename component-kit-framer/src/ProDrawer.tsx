import { useEffect, useState } from "react"
import { fetchPricing, formatPrice, type Pricing } from "./lib/pricing"
import { startCheckout } from "./lib/payments"
import { CrownIcon, CheckIcon } from "./icons"

const BENEFITS = ["Every Pro component, unlocked", "New components as they're added", "No watermarks or limits"]

export default function ProDrawer({ onClose }: { onClose: () => void }) {
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPricing()
      .then(setPricing)
      .catch(() => setPricing(null))
  }, [])

  async function handleContinue() {
    setCheckingOut(true)
    setError(null)
    try {
      await startCheckout()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout — try again")
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer pro-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-handle" />

        <div className="pro-drawer-crown">
          <CrownIcon />
        </div>
        <div className="pro-drawer-title">Unlock every component</div>

        <ul className="pro-drawer-benefits">
          {BENEFITS.map((b) => (
            <li key={b}>
              <CheckIcon /> {b}
            </li>
          ))}
        </ul>

        <button className="settings-upgrade-btn" onClick={handleContinue} disabled={checkingOut || !pricing}>
          {checkingOut ? "Opening checkout…" : pricing ? `Unlock everything · ${formatPrice(pricing)}` : "Continue"}
        </button>
        {error && <p className="settings-muted">{error}</p>}
        <p className="settings-muted">Checkout opens in your browser — once you're done, switch back to Framer and this updates automatically.</p>
      </div>
    </div>
  )
}
