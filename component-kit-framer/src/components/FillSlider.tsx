import { useRef, type PointerEvent as ReactPointerEvent } from "react"

// Custom div-based slider — Framer's embedded webview doesn't reliably render or expose native
// <input type="range"> thumb styling (accent-color, ::-webkit-slider-thumb, even
// getComputedStyle on the pseudo-element return unusable data), so this fully replaces it with
// plain positioned divs + pointer events for reliable rendering and inspection.
export function FillSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100

  function valueFromClientX(clientX: number) {
    const el = trackRef.current
    if (!el) return value
    const rect = el.getBoundingClientRect()
    const frac = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0
    const raw = min + frac * (max - min)
    const stepped = Math.round(raw / step) * step
    return Math.min(max, Math.max(min, stepped))
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(valueFromClientX(e.clientX))
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return
    onChange(valueFromClientX(e.clientX))
  }

  return (
    <div
      ref={trackRef}
      className="fill-slider"
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(max, value + step))
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(min, value - step))
      }}
    >
      <div className="fill-slider-track" />
      <div className="fill-slider-fill" style={{ width: `${pct}%` }} />
      <div className="fill-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  )
}
