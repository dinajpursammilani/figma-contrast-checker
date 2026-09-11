import { useEffect, useRef, useState, type CSSProperties } from "react"
import { framer } from "@framer/plugin"
import { generateScale, readableTextColor, LIGHT_L, DARK_L } from "./lib/color"
import { SunIcon, MoonIcon } from "./icons"
import { applyColorToSelection } from "./lib/applyColor"
import { insertColorStyles, insertTextStyles } from "./lib/framerStyles"
import { generateTextScale } from "./lib/textScale"
import { fetchPalettes, savePalette, deletePalette, type Palette } from "./lib/palettes"
import { FillSlider } from "./components/FillSlider"

type Mode = "color" | "text"

const RATIOS = [
  { label: "Minor Second", value: 1.067 },
  { label: "Major Second", value: 1.125 },
  { label: "Minor Third", value: 1.2 },
  { label: "Major Third", value: 1.25 },
  { label: "Perfect Fourth", value: 1.333 },
  { label: "Augmented Fourth", value: 1.414 },
  { label: "Perfect Fifth", value: 1.5 },
  { label: "Golden Ratio", value: 1.618 },
]

const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular", 500: "Medium",
  600: "Semibold", 700: "Bold", 800: "Extra Bold", 900: "Black",
}

/** A fully custom slider (not a styled native <input type="range">) — the native element's
 * ::-webkit-slider-thumb pseudo-element turned out impossible to reliably style OR inspect in
 * Framer's embedded webview (getComputedStyle(el, "::-webkit-slider-thumb") silently returns
 * the base element's own styles there instead of the pseudo-element's, so there was no way to
 * even verify what was actually wrong). Building the thumb as a real, plain <div> we position
 * ourselves sidesteps all of that — the fill width and thumb position both come from the exact
 * same percentage, so they can never visually disagree, and nothing here depends on any
 * browser's specific slider-rendering internals. */
function InfoDot({ title }: { title: string }) {
  return (
    <span className="colors-info-dot" title={title}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export default function Colors() {
  const [mode, setMode] = useState<Mode>("color")
  const [baseColor, setBaseColor] = useState("#4A5AFF")
  // null = derive the dark scale from the same base hue/chroma via OKLCH (just a different
  // lightness curve) — a manual override only kicks in once someone actually fine-tunes it.
  const [darkOverride, setDarkOverride] = useState<string | null>(null)
  const [finetuneOpen, setFinetuneOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [toast, setToast] = useState<string | null>(null)
  const [applyingHex, setApplyingHex] = useState<string | null>(null)
  const [palettes, setPalettes] = useState<Palette[] | null>(null)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)
  const [insertingStyles, setInsertingStyles] = useState(false)

  const [baseSize, setBaseSize] = useState(16)
  const [ratioIdx, setRatioIdx] = useState(3)
  const ratio = RATIOS[ratioIdx].value
  const [weight, setWeight] = useState(600)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [textFolderName, setTextFolderName] = useState("")
  const [insertingText, setInsertingText] = useState(false)

  // Checked once up front so the controls themselves read as disabled — rather than looking
  // clickable and only failing after a round trip — when this Framer workspace/plan doesn't
  // grant the underlying capability.
  const canEditLayers = framer.isAllowedTo("setAttributes")
  const canCreateColorStyles = framer.isAllowedTo("createColorStyle")
  const canCreateTextStyles = framer.isAllowedTo("createTextStyle")

  const darkBase = darkOverride ?? baseColor
  const lightScale = generateScale(baseColor, LIGHT_L)
  const darkScale = generateScale(darkBase, DARK_L)
  const scale = theme === "light" ? lightScale : darkScale
  const textScale = generateTextScale(baseSize, ratio)
  const [activeStep, setActiveStep] = useState(400)
  const active = scale.find((s) => s.step === activeStep) ?? scale[4]

  useEffect(() => {
    setActiveStep(400)
  }, [theme])

  useEffect(() => {
    loadPalettes()
  }, [])

  function loadPalettes() {
    fetchPalettes()
      .then(setPalettes)
      .catch((err) => showToast(err instanceof Error ? err.message : "Couldn't load palettes"))
  }

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(text: string) {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  async function handleCopy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex)
      showToast(`Copied ${hex}`)
    } catch {
      showToast(hex)
    }
  }

  async function handleApply(hex: string) {
    setApplyingHex(hex)
    try {
      const count = await applyColorToSelection(hex)
      showToast(`Applied to ${count} layer${count === 1 ? "" : "s"}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't apply color")
    } finally {
      setApplyingHex(null)
    }
  }

  async function handleSavePalette() {
    const name = saveName.trim()
    if (!name) return
    setSaving(true)
    try {
      await savePalette(name, scale.map((s) => s.hex))
      setSaveName("")
      loadPalettes()
      showToast("Palette saved")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save palette")
    } finally {
      setSaving(false)
    }
  }

  async function handleInsertColorStyles() {
    const name = saveName.trim() || "Palette"
    setInsertingStyles(true)
    try {
      const paired = lightScale.map((s, i) => ({ step: s.step, lightHex: s.hex, darkHex: darkScale[i].hex }))
      const count = await insertColorStyles(name, paired)
      showToast(`Added ${count} color style${count === 1 ? "" : "s"} to Assets → Styles`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't insert styles")
    } finally {
      setInsertingStyles(false)
    }
  }

  async function handleInsertTextStyles() {
    setInsertingText(true)
    try {
      const count = await insertTextStyles({
        folderName: textFolderName || "Type",
        baseSizePx: baseSize,
        ratio,
        weight,
        fontFamily,
      })
      showToast(`Added ${count} text style${count === 1 ? "" : "s"} to Assets → Styles`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't insert text styles")
    } finally {
      setInsertingText(false)
    }
  }

  async function handleDeletePalette(palette: Palette) {
    try {
      await deletePalette(palette.id)
      loadPalettes()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't delete palette")
    }
  }

  return (
    <div className="app">
      <div className="greeting">
        <div className="greeting-title">{mode === "color" ? "Colors" : "Type"}</div>
        <div className="greeting-subtitle">
          {mode === "color" ? "Build a color scale, insert it as real Framer Styles." : "Build a type scale, insert it as real Framer Styles."}
        </div>
      </div>

      <div className="colors-mode-tabs">
        <button className={`colors-mode-tab ${mode === "color" ? "active" : ""}`} onClick={() => setMode("color")}>
          Color
        </button>
        <button className={`colors-mode-tab ${mode === "text" ? "active" : ""}`} onClick={() => setMode("text")}>
          Text
        </button>
      </div>

      {mode === "color" ? (
        <div className="colors-scroll">
          <div className="colors-theme-row">
            <div>
              <div className="colors-section-label" style={{ margin: 0 }}>
                Base color
              </div>
              <div className={`auto-badge ${darkOverride ? "custom" : ""}`}>
                <span className="auto-dot">●</span>
                <span>{darkOverride ? "Custom dark shade" : "Auto-matched dark (OKLCH)"}</span>
                <button type="button" onClick={() => setFinetuneOpen((v) => !v)}>
                  Fine-tune
                </button>
              </div>
            </div>
            <div className="colors-theme-toggle">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Preview: light theme">
                <SunIcon />
              </button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Preview: dark theme">
                <MoonIcon />
              </button>
            </div>
          </div>

          <div className="colors-picker-row">
            <input type="color" className="colors-swatch-input" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} />
            <input
              className="search colors-hex-input"
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              spellCheck={false}
            />
          </div>

          {finetuneOpen && (
            <div className="finetune-row">
              <input type="color" className="colors-swatch-input" value={darkBase} onChange={(e) => setDarkOverride(e.target.value)} />
              <input className="search colors-hex-input" value={darkBase} onChange={(e) => setDarkOverride(e.target.value)} spellCheck={false} />
              <button
                className="finetune-reset"
                type="button"
                onClick={() => {
                  setDarkOverride(null)
                  setFinetuneOpen(false)
                }}
              >
                Reset to auto
              </button>
            </div>
          )}

          <div className="colors-section-label">Scale — previewing {theme}</div>
          <div className="colors-strip">
            {scale.map(({ step, hex }) => (
              <button
                key={step}
                className={`colors-strip-seg ${step === activeStep ? "active" : ""}`}
                style={{ "--seg-bg": hex, "--seg-color": readableTextColor(hex) } as CSSProperties}
                onClick={() => setActiveStep(step)}
              >
                {step}
              </button>
            ))}
          </div>

          <div className="colors-active-row">
            <span className="colors-active-hex">{active.hex}</span>
            <div className="colors-active-actions">
              <button className="colors-scale-btn" onClick={() => handleCopy(active.hex)}>
                Copy
              </button>
              <button
                className="colors-scale-btn"
                onClick={() => handleApply(active.hex)}
                disabled={applyingHex === active.hex || !canEditLayers}
                title={canEditLayers ? undefined : "This Framer workspace/plan doesn't allow plugins to edit layers."}
              >
                {applyingHex === active.hex ? "Applying…" : "Apply →"}
              </button>
            </div>
          </div>

          <div className="colors-save-row">
            <input
              className="search"
              placeholder="Name this palette…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePalette()}
            />
            <button className="boards-create-btn" disabled={!saveName.trim() || saving} onClick={handleSavePalette}>
              {saving ? "…" : "Save"}
            </button>
          </div>
          <div className="colors-insert-card">
            <div className="colors-insert-top">
              <div className="colors-insert-strip">
                {lightScale.map(({ step, hex }, i) => (
                  <span
                    key={step}
                    style={{ background: `linear-gradient(135deg, ${hex} 50%, ${darkScale[i].hex} 50%)` }}
                  />
                ))}
              </div>
              <div className="colors-insert-meta">
                <span className="colors-insert-count">{lightScale.length} Color Styles</span>
                <span className="colors-insert-sub">each with a matched light + dark value</span>
              </div>
            </div>
            <button
              className="colors-insert-btn"
              onClick={handleInsertColorStyles}
              disabled={insertingStyles || !canCreateColorStyles}
              title={canCreateColorStyles ? undefined : "This Framer workspace/plan doesn't allow plugins to create styles."}
            >
              {insertingStyles ? "Adding…" : "Insert as Color Styles →"}
            </button>
          </div>
          <p className="settings-muted colors-hint">
            Adds every step above as a real Framer Color Style under Assets → Styles — reusable by any component in this project.
          </p>

          {palettes && palettes.length > 0 && (
            <div className="colors-saved">
              <div className="colors-section-label">Saved palettes</div>
              {palettes.map((p) => (
                <div key={p.id} className="colors-saved-row">
                  <button className="colors-strip colors-strip-mini" onClick={() => setBaseColor(p.colors[Math.floor(p.colors.length / 2)] ?? p.colors[0])}>
                    {p.colors.map((hex, i) => (
                      <span key={i} className="colors-strip-seg" style={{ "--seg-bg": hex } as CSSProperties} />
                    ))}
                  </button>
                  <span className="colors-saved-name">{p.name}</span>
                  <span className="colors-saved-delete" onClick={() => handleDeletePalette(p)}>
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="colors-scroll">
          <div className="colors-text-controls" style={{ paddingTop: 12 }}>
            <div className="colors-control-row">
              <label className="onboarding-label colors-field-top">
                Base size
                <InfoDot title="The root paragraph size everything else scales from." />
              </label>
              <span className="colors-control-value">{baseSize}px</span>
            </div>
            <FillSlider min={12} max={24} value={baseSize} onChange={setBaseSize} />

            <div className="colors-control-row">
              <label className="onboarding-label colors-field-top">
                Scale ratio
                <InfoDot title="How much bigger each heading step is than the one below it." />
              </label>
              <span className="colors-control-value">
                {RATIOS[ratioIdx].label} {ratio}
              </span>
            </div>
            <FillSlider min={0} max={RATIOS.length - 1} value={ratioIdx} onChange={setRatioIdx} />

            <div className="colors-control-row">
              <label className="onboarding-label">Weight</label>
              <span className="colors-control-value">
                {WEIGHT_LABELS[weight] ?? ""} {weight}
              </span>
            </div>
            <FillSlider min={100} max={900} step={100} value={weight} onChange={setWeight} />
          </div>

          <div className="colors-section-label" style={{ marginTop: 4 }}>
            Preview
          </div>
          <div className="colors-type-specimen">
            {textScale.map((s) => (
              <div key={s.label} className="colors-type-row">
                <div className="colors-type-meta">
                  <span className="colors-type-label">{s.label}</span>
                  <span className="colors-type-size">{s.sizePx}px</span>
                </div>
                <div
                  className="colors-type-sample"
                  style={{ fontSize: s.sizePx, fontWeight: weight, fontFamily }}
                >
                  The quick brown fox
                </div>
              </div>
            ))}
          </div>

          <div className="colors-text-controls" style={{ paddingTop: 14 }}>
            <label className="onboarding-label">Font</label>
            <input className="onboarding-input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} />
          </div>

          <div className="colors-save-row">
            <input
              className="search"
              placeholder="Name this type set…"
              value={textFolderName}
              onChange={(e) => setTextFolderName(e.target.value)}
            />
          </div>
          {!textFolderName.trim() && (
            <p className="settings-muted colors-hint" style={{ paddingTop: 6 }}>
              Name it above to insert these as Framer Text Styles.
            </p>
          )}
          <div className="colors-insert-card">
            <div className="colors-insert-top">
              <div className="colors-insert-chips">
                {textScale.map((s) => (
                  <span key={s.label} className="colors-insert-chip">
                    {s.label}
                  </span>
                ))}
              </div>
              <div className="colors-insert-meta">
                <span className="colors-insert-count">{textScale.length} Text Styles</span>
                <span className="colors-insert-sub">H1–H6 and P1–P3</span>
              </div>
            </div>
            <button
              className="colors-insert-btn"
              onClick={handleInsertTextStyles}
              disabled={insertingText || !textFolderName.trim() || !canCreateTextStyles}
              title={canCreateTextStyles ? undefined : "This Framer workspace/plan doesn't allow plugins to create styles."}
            >
              {insertingText ? "Adding…" : "Insert Text Styles →"}
            </button>
          </div>
          <p className="settings-muted colors-hint">
            Adds H1-H6 and P1-P3 as real Framer Text Styles under Assets → Styles. If "{fontFamily}" isn't available, styles fall back
            to Framer's default font.
          </p>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
