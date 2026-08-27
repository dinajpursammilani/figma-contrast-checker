/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 360, height: 480 });

function getSolidFill(node: SceneNode): RGB | null {
  if (!("fills" in node)) return null;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return null;
  const solid = [...fills].reverse().find((f) => f.type === "SOLID" && f.visible !== false) as
    | SolidPaint
    | undefined;
  return solid ? solid.color : null;
}

function relativeLuminance({ r, g, b }: RGB): number {
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [R, G, B] = [linear(r), linear(g), linear(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a: RGB, b: RGB): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Walks up the ancestor chain to find the nearest visible solid background. */
function findBackgroundColor(node: SceneNode): RGB | null {
  let current: BaseNode | null = node.parent;
  while (current) {
    if ("fills" in current) {
      const color = getSolidFill(current as SceneNode);
      if (color) return color;
    }
    current = current.parent;
  }
  return { r: 1, g: 1, b: 1 }; // default to canvas white
}

function collectTextNodes(node: SceneNode, out: TextNode[]) {
  if (node.type === "TEXT" && node.visible) out.push(node);
  if ("children" in node) {
    for (const child of node.children) collectTextNodes(child, out);
  }
}

/** Adjusts a color's lightness (HSL) toward black/white until it hits the target ratio against bg. */
function suggestFix(fg: RGB, bg: RGB, target: number): RGB {
  const bgLum = relativeLuminance(bg);
  const goDarker = bgLum > 0.5; // light background -> darken text; dark background -> lighten text

  const { h, s } = rgbToHsl(fg);
  let lo = 0;
  let hi = 1;
  let best = fg;

  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const l = goDarker ? mid : 1 - mid;
    const candidate = hslToRgb(h, s, l);
    const ratio = contrastRatio(candidate, bg);
    if (ratio >= target) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) return { r: l, g: l, b: l };
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3),
  };
}

// ---- Pair mode (compare exactly 2 selected layers) ----

function evaluatePair() {
  const selection = figma.currentPage.selection;

  if (selection.length !== 2) {
    figma.ui.postMessage({ type: "pair-error", message: "Select exactly 2 layers with solid fills." });
    return;
  }

  const [a, b] = selection;
  const colorA = getSolidFill(a);
  const colorB = getSolidFill(b);

  if (!colorA || !colorB) {
    figma.ui.postMessage({ type: "pair-error", message: "Both layers need a visible solid fill." });
    return;
  }

  const ratio = contrastRatio(colorA, colorB);

  figma.ui.postMessage({
    type: "pair-result",
    ratio: Math.round(ratio * 100) / 100,
    hexA: toHex(colorA),
    hexB: toHex(colorB),
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
  });
}

// ---- Scan mode (audit every text layer in the selection/page) ----

function runScan() {
  const roots = figma.currentPage.selection.length > 0 ? figma.currentPage.selection : figma.currentPage.children;

  const textNodes: TextNode[] = [];
  for (const root of roots) collectTextNodes(root, textNodes);

  if (textNodes.length === 0) {
    figma.ui.postMessage({ type: "scan-result", items: [], scope: figma.currentPage.selection.length > 0 ? "selection" : "page" });
    return;
  }

  const items = textNodes.map((node) => {
    const fg = getSolidFill(node) || { r: 0, g: 0, b: 0 };
    const bg = findBackgroundColor(node) || { r: 1, g: 1, b: 1 };
    const ratio = contrastRatio(fg, bg);
    const fontSize = typeof node.fontSize === "number" ? node.fontSize : 16;
    const isLarge = fontSize >= 24;
    const passes = ratio >= (isLarge ? 3 : 4.5);

    return {
      id: node.id,
      name: node.name,
      ratio: Math.round(ratio * 100) / 100,
      hexFg: toHex(fg),
      hexBg: toHex(bg),
      isLarge,
      passes,
    };
  });

  items.sort((x, y) => (x.passes === y.passes ? x.ratio - y.ratio : x.passes ? 1 : -1));

  figma.ui.postMessage({
    type: "scan-result",
    items,
    scope: figma.currentPage.selection.length > 0 ? "selection" : "page",
  });
}

function focusNode(id: string) {
  const node = figma.getNodeById(id);
  if (!node || !("visible" in node)) return;
  figma.currentPage.selection = [node as SceneNode];
  figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
}

function applyFix(id: string) {
  const node = figma.getNodeById(id) as TextNode | null;
  if (!node || node.type !== "TEXT") return;

  const fg = getSolidFill(node);
  const bg = findBackgroundColor(node);
  if (!fg || !bg) return;

  const fontSize = typeof node.fontSize === "number" ? node.fontSize : 16;
  const target = fontSize >= 24 ? 3 : 4.5;
  const fixed = suggestFix(fg, bg, target);

  node.fills = [{ type: "SOLID", color: fixed }];
  runScan();
}

// ---- message routing ----

figma.on("selectionchange", () => {
  evaluatePair();
});

figma.ui.onmessage = (msg) => {
  if (msg.type === "pair-refresh") evaluatePair();
  if (msg.type === "scan") runScan();
  if (msg.type === "focus") focusNode(msg.id);
  if (msg.type === "fix") applyFix(msg.id);
};

evaluatePair();
runScan();
