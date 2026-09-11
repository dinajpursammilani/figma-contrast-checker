import DOMPurify from "dompurify"

/** Strict allowlist for rendering `preview_svg` — that field comes from Supabase, editable
 * independently of the published plugin build, so it must never reach dangerouslySetInnerHTML
 * un-sanitized (flagged in Framer's plugin review). Strips <script>/<foreignObject>, every
 * event-handler attribute, and javascript: URLs by default; ALLOWED_URI_REGEXP additionally
 * blocks remote http(s) references — a preview is a self-contained vector graphic, it has no
 * legitimate reason to reach the network — while still allowing `data:` URIs and the
 * `#fragment`/`url(#fragment)` refs real generated SVGs rely on for local gradients, clip-paths,
 * masks, filters, and <use> (added back in — DOMPurify's SVG profile omits it by default,
 * confirmed via testing real gradient+<use> markup that this profile alone silently drops both
 * the element and any `fill="url(#id)"`-style attribute, which would have visibly broken every
 * preview built that way, not just a hypothetical edge case). ALLOWED_URI_REGEXP only reaches
 * dedicated URI attributes (href, xlink:href, ...); DOMPurify does not vet `url(...)` written
 * inside a `style` attribute's CSS text, so the added hook below scrubs `javascript:`/
 * `expression(` out of style values specifically — confirmed via testing that this is otherwise
 * the one gap left open. */
const ALLOWED_URI_REGEXP = /^(?:data:|#|url\(#)/i

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style" && /javascript:|expression\(/i.test(data.attrValue)) {
    data.keepAttr = false
  }
})

export function sanitizePreviewSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed"],
    ADD_TAGS: ["use"],
    ALLOWED_URI_REGEXP,
  })
}
