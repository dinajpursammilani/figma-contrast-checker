function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "")
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

// ---- OKLCH color math (Björn Ottosson's sRGB <-> OKLab/OKLCH formulas) ----
// Perceptually uniform lightness means the same base hue/chroma can generate both a light and a
// dark scale just by swapping which lightness curve you sample — no separate darken heuristic
// needed the way naive HSL lightening/darkening requires.

function srgbToLinear(c: number): number {
  const n = c / 255
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
}

function linToSrgbChannel(c: number): number {
  const n = Math.max(c, 0)
  return n <= 0.0031308 ? n * 12.92 : 1.055 * Math.pow(n, 1 / 2.4) - 0.055
}

export interface Oklch {
  L: number
  C: number
  H: number
}

export function hexToOklch(hex: string): Oklch {
  const { r, g, b } = hexToRgb(hex)
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const C = Math.sqrt(A * A + B * B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360
  return { L, C, H }
}

function oklchToRawLinear(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180
  const A = Math.cos(hr) * C
  const B = Math.sin(hr) * C
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B
  const s_ = L - 0.0894841775 * A - 1.291485548 * B
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** Walks chroma down until the color fits in sRGB gamut — an out-of-gamut OKLCH color clips to
 * nonsense RGB otherwise, so this gamut-maps by desaturating rather than clamping each channel
 * independently (which shifts the hue). */
export function oklchToHex(L: number, C: number, H: number): string {
  let c = Math.max(C, 0)
  let lr = 0, lg = 0, lb = 0
  for (let i = 0; i < 20; i++) {
    ;[lr, lg, lb] = oklchToRawLinear(L, c, H)
    const sr = linToSrgbChannel(lr)
    const sg = linToSrgbChannel(lg)
    const sb = linToSrgbChannel(lb)
    if (sr >= -0.001 && sr <= 1.001 && sg >= -0.001 && sg <= 1.001 && sb >= -0.001 && sb <= 1.001) break
    c *= 0.93
  }
  const toByte = (v: number) => Math.max(0, Math.min(255, Math.round(linToSrgbChannel(v) * 255)))
  const toHex = (v: number) => v.toString(16).padStart(2, "0")
  return `#${toHex(toByte(lr))}${toHex(toByte(lg))}${toHex(toByte(lb))}`.toUpperCase()
}

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800]
/** Lightness curves for the light-theme and dark-theme scales — same hue/chroma, different L. */
export const LIGHT_L = [0.97, 0.91, 0.82, 0.7, 0.58, 0.48, 0.4, 0.32, 0.24]
export const DARK_L = [0.22, 0.28, 0.35, 0.44, 0.54, 0.64, 0.74, 0.83, 0.9]

export function generateScale(baseHex: string, curve: number[]): { step: number; hex: string }[] {
  const { C, H } = hexToOklch(baseHex)
  return curve.map((L, i) => ({ step: SCALE_STEPS[i], hex: oklchToHex(L, C, H) }))
}

/** Framer's Color Style API stores/expects rgba strings, not hex (confirmed in the SDK's own
 * doc examples — "rgba(242, 59, 57, 1)"), so anything we hand to createColorStyle needs this
 * conversion first. */
export function hexToRgbaString(hex: string, alpha = 1): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#000000" : "#ffffff"
}
