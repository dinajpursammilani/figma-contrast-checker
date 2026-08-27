# Component Kit

A Figma plugin that inserts real, pre-built, styled components onto your canvas from a browsable gallery — inspired by tools like [Kompa](https://www.framer.com/marketplace/plugins/kompa/) for Framer.

Search or filter by category (Sections, Navigation, Cards), click a component, and it drops onto the canvas at your current viewport — fully built with auto layout, real typography, and a consistent design system, ready to restyle.

## Components included

- Hero
- Navbar
- Pricing Card
- Testimonial
- Feature Card
- CTA Banner
- Footer
- Stats Row

## Development

```bash
npm install
npm run build
```

Then in Figma: **Plugins → Development → Import plugin from manifest** and select `manifest.json` in this repo.

## How it works

- `src/code.ts` — runs in Figma's plugin sandbox. Each component is built programmatically with real Figma nodes (auto-layout frames, text, shapes) using a shared color/typography system, not pasted-in assets.
- `src/ui.html` — the gallery UI: searchable, filterable grid with lightweight SVG previews. Clicking a card posts a message to insert that component.
