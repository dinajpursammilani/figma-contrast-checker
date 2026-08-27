# Figma Contrast Checker

A minimal Figma plugin that checks WCAG contrast ratio between two selected layers' fill colors, live.

Select any two layers with solid fills — text, shapes, whatever — and the plugin shows:

- Contrast ratio (e.g. `4.52:1`)
- Pass/fail against WCAG AA (normal text, large text) and AAA (normal text)

Updates automatically as your selection changes.

## Development

```bash
npm install
npm run build
```

Then in Figma: **Plugins → Development → Import plugin from manifest** and select `manifest.json` in this repo.

## How it works

- `src/code.ts` — runs in Figma's plugin sandbox, reads selected nodes' fills, computes relative luminance and contrast ratio per the [WCAG 2.1 formula](https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
- `src/ui.html` — the plugin panel UI, receives results via `postMessage`.
