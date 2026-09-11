import { useEffect, useMemo, useState } from "react"
import { fetchPricing, formatPrice, type Pricing } from "./lib/pricing"
import { startCheckout, getProStatus } from "./lib/payments"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { CrownIcon, CreditCardIcon, CheckIcon } from "./icons"
import { sanitizePreviewSvg } from "./lib/sanitizeSvg"

const COMPARE_ROWS: { label: string; free: string; pro: string | "check" }[] = [
  { label: "Components", free: "Free tier", pro: "Everything" },
  { label: "Saved boards", free: "—", pro: "check" },
  { label: "Color tool", free: "Locked", pro: "check" },
  { label: "New components", free: "Free only", pro: "As they ship" },
  { label: "Watermarks", free: "—", pro: "None" },
]

/** A real, auto-advancing carousel through actual Pro-tier components — same interaction
 * pattern as a testimonial carousel (arrows, dots, auto-rotate), just pointed at honest
 * content (our own components) instead of an invented customer quote. */
function ProCarousel({ components }: { components: ComponentRow[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (components.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % components.length), 3200)
    return () => clearInterval(timer)
  }, [components.length])

  if (components.length === 0) return null

  return (
    <>
      <div className="pro-carousel">
        <button
          className="pro-car-arrow"
          onClick={() => setIndex((i) => (i - 1 + components.length) % components.length)}
          aria-label="Previous"
        >
          ‹
        </button>
        <div className="pro-car-viewport">
          <div className="pro-car-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {components.map((c) => (
              <div className="pro-car-card" key={c.id}>
                <div className="pro-car-preview">
                  {c.preview_image_url ? (
                    <img src={c.preview_image_url} alt="" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: sanitizePreviewSvg(c.preview_svg!) }} />
                  )}
                </div>
                <div className="pro-car-meta">
                  <span className="pro-car-name">{c.name}</span>
                  <span className="pro-badge">PRO</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="pro-car-arrow" onClick={() => setIndex((i) => (i + 1) % components.length)} aria-label="Next">
          ›
        </button>
      </div>
      <div className="pro-car-dots">
        {components.map((_, i) => (
          <button key={i} className={`pro-car-dot ${i === index ? "active" : ""}`} onClick={() => setIndex(i)} />
        ))}
      </div>
    </>
  )
}

export default function ProDrawer({ proAvailable, onClose }: { proAvailable: boolean | null; onClose: () => void }) {
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [components, setComponents] = useState<ComponentRow[] | null>(null)

  useEffect(() => {
    fetchPricing()
      .then(setPricing)
      .catch(() => setPricing(null))
  }, [])

  useEffect(() => {
    fetchComponents()
      .then(setComponents)
      .catch(() => setComponents([]))
  }, [])

  const proCarouselItems = useMemo(
    () => (components ?? []).filter((c) => c.is_pro && (c.preview_svg || c.preview_image_url)),
    [components]
  )

  useEffect(() => {
    // Checkout happens in a separate browser tab, so nothing pushes the result back in here —
    // same pattern Settings/App use for the Plan section: refetch Pro status whenever the user
    // switches focus back to Framer, and close this screen the moment it comes back true.
    async function checkIfNowPro() {
      if (document.visibilityState !== "visible") return
      if (await getProStatus()) onClose()
    }
    document.addEventListener("visibilitychange", checkIfNowPro)
    window.addEventListener("focus", checkIfNowPro)
    return () => {
      document.removeEventListener("visibilitychange", checkIfNowPro)
      window.removeEventListener("focus", checkIfNowPro)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleContinue() {
    setCheckingOut(true)
    setError(null)
    setCheckoutUrl(null)
    try {
      const url = await startCheckout()
      setCheckoutUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout — try again")
    } finally {
      setCheckingOut(false)
    }
  }

  if (proAvailable === false) {
    return (
      <div className="pro-screen">
        <div className="pro-header">
          <button className="boards-back" onClick={onClose}>
            ‹ Back
          </button>
        </div>
        <div className="pro-scroll">
          <div className="pro-hero">
            <div className="pro-badge-row">
              <div className="pro-crown">
                <CrownIcon />
              </div>
              <span className="pro-eyebrow">SOON</span>
            </div>
            <h2>Pro is coming soon</h2>
            <p>We're building out the Pro component library — check back soon for every component, unlocked.</p>
          </div>
          <ProCarousel components={proCarouselItems} />
        </div>
      </div>
    )
  }

  return (
    <div className="pro-screen">
      <div className="pro-header">
        <button className="boards-back" onClick={onClose}>
          ‹ Back
        </button>
      </div>
      <div className="pro-scroll">
        <div className="pro-hero">
          <div className="pro-badge-row">
            <div className="pro-crown">
              <CrownIcon />
            </div>
            <span className="pro-eyebrow">PRO</span>
          </div>
          <h2>Unlock every component</h2>
          <p>One plan, everything Skela makes.</p>
        </div>

        <ProCarousel components={proCarouselItems} />

        <div className="pro-price-card">
          <div className="pro-price-icon">
            <CreditCardIcon />
          </div>
          <div>
            <div className="pro-price-amount">{pricing ? formatPrice(pricing) : "…"}</div>
            <div className="pro-price-sub">Billed via Polar</div>
          </div>
        </div>

        <div className="pro-table-card">
          <div className="pro-table-head">
            <span></span>
            <span>Free</span>
            <span className="pro-col-head">Pro</span>
          </div>
          {COMPARE_ROWS.map((row) => (
            <div className="pro-table-row" key={row.label}>
              <span>{row.label}</span>
              <span>{row.free}</span>
              <span className="pro-col">{row.pro === "check" ? <CheckIcon /> : row.pro}</span>
            </div>
          ))}
        </div>

        <div className="pro-note">
          {error && <p className="settings-muted">{error}</p>}
          {checkoutUrl && (
            <p className="settings-muted">
              Didn't open?{" "}
              <a className="settings-link" href={checkoutUrl} target="_blank" rel="noreferrer">
                Click here
              </a>
            </p>
          )}
          <p className="settings-muted">Checkout opens in your browser — once you're done, switch back to Framer and this updates automatically.</p>
        </div>
      </div>

      <div className="pro-actions">
        <button className="settings-upgrade-btn" onClick={handleContinue} disabled={checkingOut || !pricing}>
          {checkingOut ? "Opening checkout…" : pricing ? `Continue · ${formatPrice(pricing)}` : "Continue"}
        </button>
      </div>
    </div>
  )
}
