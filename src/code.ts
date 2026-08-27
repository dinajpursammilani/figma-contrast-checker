/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 280 });

function getFillColor(node: SceneNode): RGB | null {
  if (!("fills" in node)) return null;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return null;
  const solid = fills.find((f) => f.type === "SOLID" && f.visible !== false) as SolidPaint | undefined;
  if (!solid) return null;
  return solid.color;
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

function evaluate() {
  const selection = figma.currentPage.selection;

  if (selection.length !== 2) {
    figma.ui.postMessage({ type: "error", message: "Select exactly 2 layers with solid fills." });
    return;
  }

  const [a, b] = selection;
  const colorA = getFillColor(a);
  const colorB = getFillColor(b);

  if (!colorA || !colorB) {
    figma.ui.postMessage({ type: "error", message: "Both layers need a visible solid fill." });
    return;
  }

  const ratio = contrastRatio(colorA, colorB);

  figma.ui.postMessage({
    type: "result",
    ratio: Math.round(ratio * 100) / 100,
    hexA: toHex(colorA),
    hexB: toHex(colorB),
    nameA: a.name,
    nameB: b.name,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
  });
}

figma.on("selectionchange", evaluate);
evaluate();

figma.ui.onmessage = (msg) => {
  if (msg.type === "refresh") evaluate();
};
