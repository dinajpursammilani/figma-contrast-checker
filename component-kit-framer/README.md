# Component Kit (Framer)

The Framer port of [Component Kit](../component-kit) — same exact gallery UI, same 8 components, adapted to Framer's plugin API (React + `@framer/plugin`).

Search or filter by category, click a component, and it's inserted onto the canvas as a fully-styled vector graphic — ready to restyle or detach.

## Development

```bash
npm install
npm run dev
```

In Framer: enable **Developer Tools** in the Plugins sub-menu of the main menu, then load this plugin from the dev server URL Vite prints.

```bash
npm run build
```

produces a production `dist/` you can zip and submit to the Framer Marketplace.

## How it works

- `src/App.tsx` / `src/App.css` — the gallery UI, ported 1:1 from the Figma plugin's `ui.html` (same categories, search, card grid, hover states).
- `src/nodeBuilders.ts` — generates each component as a real SVG (matching the Figma version's design system: colors, type scale, spacing) and inserts it via `framer.addSVG()`, the supported canvas-insertion API.
- `framer.json` — the plugin manifest (id, name, mode, icon), copied into the build by `vite-plugin-framer`.
