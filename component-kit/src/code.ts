/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 400, height: 560 });

const COLOR = {
  ink: { r: 0.09, g: 0.09, b: 0.11 },
  inkMuted: { r: 0.45, g: 0.45, b: 0.48 },
  white: { r: 1, g: 1, b: 1 },
  surface: { r: 0.97, g: 0.97, b: 0.98 },
  border: { r: 0.9, g: 0.9, b: 0.91 },
  accent: { r: 0.29, g: 0.36, b: 1 },
  accentSoft: { r: 0.92, g: 0.93, b: 1 },
};

let fontsLoaded = false;
async function ensureFonts() {
  if (fontsLoaded) return;
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
  ]);
  fontsLoaded = true;
}

function solid(color: RGB, opacity = 1): SolidPaint {
  return { type: "SOLID", color, opacity };
}

function makeText(content: string, size: number, weight: "Regular" | "Medium" | "Bold", color: RGB): TextNode {
  const node = figma.createText();
  node.fontName = { family: "Inter", style: weight };
  node.fontSize = size;
  node.characters = content;
  node.fills = [solid(color)];
  return node;
}

function makeFrame(name: string, direction: "HORIZONTAL" | "VERTICAL"): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.fills = [];
  return frame;
}

function makeButton(label: string, filled: boolean): FrameNode {
  const btn = makeFrame("Button", "HORIZONTAL");
  btn.paddingLeft = btn.paddingRight = 20;
  btn.paddingTop = btn.paddingBottom = 10;
  btn.cornerRadius = 8;
  btn.fills = [solid(filled ? COLOR.accent : COLOR.white)];
  if (!filled) {
    btn.strokes = [solid(COLOR.border)];
    btn.strokeWeight = 1;
  }
  const text = makeText(label, 14, "Medium", filled ? COLOR.white : COLOR.ink);
  btn.appendChild(text);
  return btn;
}

function makeAvatar(size: number): EllipseNode {
  const el = figma.createEllipse();
  el.resize(size, size);
  el.fills = [solid(COLOR.accentSoft)];
  return el;
}

function placeholderRect(w: number, h: number, radius = 12): RectangleNode {
  const rect = figma.createRectangle();
  rect.resize(w, h);
  rect.cornerRadius = radius;
  rect.fills = [solid(COLOR.surface)];
  rect.strokes = [solid(COLOR.border)];
  rect.strokeWeight = 1;
  return rect;
}

// ---- Component builders ----

function buildHero(): FrameNode {
  const root = makeFrame("Hero", "VERTICAL");
  root.counterAxisAlignItems = "CENTER";
  root.itemSpacing = 20;
  root.paddingTop = root.paddingBottom = 80;
  root.paddingLeft = root.paddingRight = 60;
  root.fills = [solid(COLOR.white)];
  root.resize(640, root.height);
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";

  const eyebrow = makeText("NEW · V2.0", 12, "Bold", COLOR.accent);
  const heading = makeText("Design faster,\nship with confidence", 40, "Bold", COLOR.ink);
  heading.textAlignHorizontal = "CENTER";
  heading.lineHeight = { value: 110, unit: "PERCENT" };
  const sub = makeText("A component library built for teams who care about speed and craft in equal measure.", 16, "Regular", COLOR.inkMuted);
  sub.textAlignHorizontal = "CENTER";
  sub.resize(440, sub.height);
  sub.textAutoResize = "HEIGHT";

  const row = makeFrame("Actions", "HORIZONTAL");
  row.itemSpacing = 12;
  row.fills = [];
  row.appendChild(makeButton("Get started", true));
  row.appendChild(makeButton("View docs", false));

  [eyebrow, heading, sub, row].forEach((n) => root.appendChild(n));
  return root;
}

function buildNavbar(): FrameNode {
  const root = makeFrame("Navbar", "HORIZONTAL");
  root.counterAxisAlignItems = "CENTER";
  root.primaryAxisAlignItems = "SPACE_BETWEEN";
  root.paddingLeft = root.paddingRight = 32;
  root.paddingTop = root.paddingBottom = 16;
  root.fills = [solid(COLOR.white)];
  root.strokes = [solid(COLOR.border)];
  root.strokeWeight = 1;
  root.strokeAlign = "INSIDE";
  root.primaryAxisSizingMode = "FIXED";
  root.counterAxisSizingMode = "AUTO";
  root.resize(720, root.height);

  const logo = makeText("Acme", 18, "Bold", COLOR.ink);

  const links = makeFrame("Links", "HORIZONTAL");
  links.itemSpacing = 28;
  links.fills = [];
  ["Product", "Pricing", "Docs", "Blog"].forEach((label) => {
    links.appendChild(makeText(label, 14, "Medium", COLOR.inkMuted));
  });

  const actions = makeFrame("Actions", "HORIZONTAL");
  actions.itemSpacing = 12;
  actions.fills = [];
  actions.appendChild(makeText("Log in", 14, "Medium", COLOR.ink));
  actions.appendChild(makeButton("Sign up", true));

  [logo, links, actions].forEach((n) => root.appendChild(n));
  return root;
}

function buildPricingCard(): FrameNode {
  const root = makeFrame("Pricing Card", "VERTICAL");
  root.itemSpacing = 20;
  root.paddingTop = root.paddingBottom = 28;
  root.paddingLeft = root.paddingRight = 28;
  root.cornerRadius = 16;
  root.fills = [solid(COLOR.white)];
  root.strokes = [solid(COLOR.border)];
  root.strokeWeight = 1;
  root.resize(280, root.height);
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";

  const plan = makeText("Pro", 14, "Bold", COLOR.accent);
  const priceRow = makeFrame("Price", "HORIZONTAL");
  priceRow.counterAxisAlignItems = "BASELINE";
  priceRow.itemSpacing = 4;
  priceRow.fills = [];
  priceRow.appendChild(makeText("$24", 36, "Bold", COLOR.ink));
  priceRow.appendChild(makeText("/mo", 14, "Regular", COLOR.inkMuted));

  const features = makeFrame("Features", "VERTICAL");
  features.itemSpacing = 10;
  features.fills = [];
  ["Unlimited projects", "Priority support", "Team collaboration", "Advanced analytics"].forEach((f) => {
    const row = makeFrame("Feature", "HORIZONTAL");
    row.itemSpacing = 8;
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];
    const check = makeText("✓", 13, "Bold", COLOR.accent);
    row.appendChild(check);
    row.appendChild(makeText(f, 13, "Regular", COLOR.ink));
    features.appendChild(row);
  });

  const cta = makeButton("Choose plan", true);
  cta.layoutAlign = "STRETCH";
  cta.primaryAxisAlignItems = "CENTER";

  [plan, priceRow, features, cta].forEach((n) => root.appendChild(n));
  return root;
}

function buildTestimonial(): FrameNode {
  const root = makeFrame("Testimonial", "VERTICAL");
  root.itemSpacing = 20;
  root.paddingTop = root.paddingBottom = 32;
  root.paddingLeft = root.paddingRight = 32;
  root.cornerRadius = 16;
  root.fills = [solid(COLOR.surface)];
  root.resize(420, root.height);
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";

  const quote = makeText("“This tool cut our design-to-dev handoff time in half. It's become part of how we ship every week.”", 18, "Medium", COLOR.ink);
  quote.lineHeight = { value: 140, unit: "PERCENT" };
  quote.resize(356, quote.height);
  quote.textAutoResize = "HEIGHT";

  const person = makeFrame("Person", "HORIZONTAL");
  person.itemSpacing = 10;
  person.counterAxisAlignItems = "CENTER";
  person.fills = [];
  person.appendChild(makeAvatar(36));
  const meta = makeFrame("Meta", "VERTICAL");
  meta.itemSpacing = 2;
  meta.fills = [];
  meta.appendChild(makeText("Jordan Lee", 13, "Bold", COLOR.ink));
  meta.appendChild(makeText("Design Lead, Northwind", 12, "Regular", COLOR.inkMuted));
  person.appendChild(meta);

  [quote, person].forEach((n) => root.appendChild(n));
  return root;
}

function buildFeatureCard(): FrameNode {
  const root = makeFrame("Feature Card", "VERTICAL");
  root.itemSpacing = 14;
  root.paddingTop = root.paddingBottom = 24;
  root.paddingLeft = root.paddingRight = 24;
  root.cornerRadius = 14;
  root.fills = [solid(COLOR.white)];
  root.strokes = [solid(COLOR.border)];
  root.strokeWeight = 1;
  root.resize(240, root.height);
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";

  const iconBg = makeFrame("Icon", "HORIZONTAL");
  iconBg.resize(40, 40);
  iconBg.primaryAxisSizingMode = "FIXED";
  iconBg.counterAxisSizingMode = "FIXED";
  iconBg.primaryAxisAlignItems = "CENTER";
  iconBg.counterAxisAlignItems = "CENTER";
  iconBg.cornerRadius = 10;
  iconBg.fills = [solid(COLOR.accentSoft)];
  iconBg.appendChild(makeText("★", 16, "Bold", COLOR.accent));

  const title = makeText("Real-time sync", 15, "Bold", COLOR.ink);
  const body = makeText("Changes reflect instantly across every teammate's canvas, no refresh needed.", 13, "Regular", COLOR.inkMuted);
  body.lineHeight = { value: 140, unit: "PERCENT" };
  body.resize(192, body.height);
  body.textAutoResize = "HEIGHT";

  [iconBg, title, body].forEach((n) => root.appendChild(n));
  return root;
}

function buildCtaBanner(): FrameNode {
  const root = makeFrame("CTA Banner", "HORIZONTAL");
  root.primaryAxisAlignItems = "SPACE_BETWEEN";
  root.counterAxisAlignItems = "CENTER";
  root.paddingTop = root.paddingBottom = 40;
  root.paddingLeft = root.paddingRight = 48;
  root.cornerRadius = 20;
  root.fills = [solid(COLOR.ink)];
  root.resize(680, root.height);
  root.primaryAxisSizingMode = "FIXED";
  root.counterAxisSizingMode = "AUTO";

  const copy = makeFrame("Copy", "VERTICAL");
  copy.itemSpacing = 6;
  copy.fills = [];
  copy.appendChild(makeText("Ready to get started?", 22, "Bold", COLOR.white));
  copy.appendChild(makeText("Join thousands of teams already shipping faster.", 14, "Regular", { r: 0.75, g: 0.75, b: 0.78 }));

  const btn = makeButton("Start free trial", true);
  btn.fills = [solid(COLOR.white)];
  (btn.children[0] as TextNode).fills = [solid(COLOR.ink)];

  [copy, btn].forEach((n) => root.appendChild(n));
  return root;
}

function buildFooter(): FrameNode {
  const root = makeFrame("Footer", "VERTICAL");
  root.itemSpacing = 32;
  root.paddingTop = 40;
  root.paddingBottom = 24;
  root.paddingLeft = root.paddingRight = 48;
  root.fills = [solid(COLOR.white)];
  root.resize(720, root.height);
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";

  const columns = makeFrame("Columns", "HORIZONTAL");
  columns.itemSpacing = 60;
  columns.fills = [];
  const groups: [string, string[]][] = [
    ["Product", ["Overview", "Pricing", "Changelog"]],
    ["Company", ["About", "Careers", "Press"]],
    ["Resources", ["Docs", "Guides", "Support"]],
  ];
  groups.forEach(([title, links]) => {
    const col = makeFrame("Column", "VERTICAL");
    col.itemSpacing = 10;
    col.fills = [];
    col.appendChild(makeText(title, 13, "Bold", COLOR.ink));
    links.forEach((l) => col.appendChild(makeText(l, 13, "Regular", COLOR.inkMuted)));
    columns.appendChild(col);
  });

  const divider = figma.createRectangle();
  divider.resize(624, 1);
  divider.fills = [solid(COLOR.border)];

  const bottom = makeFrame("Bottom", "HORIZONTAL");
  bottom.primaryAxisAlignItems = "SPACE_BETWEEN";
  bottom.primaryAxisSizingMode = "FIXED";
  bottom.resize(624, bottom.height);
  bottom.fills = [];
  bottom.appendChild(makeText("© 2026 Acme, Inc.", 12, "Regular", COLOR.inkMuted));
  bottom.appendChild(makeText("Privacy · Terms", 12, "Regular", COLOR.inkMuted));

  [columns, divider, bottom].forEach((n) => root.appendChild(n));
  return root;
}

function buildStatsRow(): FrameNode {
  const root = makeFrame("Stats Row", "HORIZONTAL");
  root.itemSpacing = 48;
  root.paddingTop = root.paddingBottom = 24;
  root.fills = [];

  [
    ["120k+", "Active users"],
    ["4.9/5", "Average rating"],
    ["99.9%", "Uptime"],
  ].forEach(([num, label]) => {
    const col = makeFrame("Stat", "VERTICAL");
    col.itemSpacing = 4;
    col.counterAxisAlignItems = "CENTER";
    col.fills = [];
    col.appendChild(makeText(num, 28, "Bold", COLOR.ink));
    col.appendChild(makeText(label, 13, "Regular", COLOR.inkMuted));
    root.appendChild(col);
  });

  return root;
}

const BUILDERS: Record<string, () => FrameNode> = {
  hero: buildHero,
  navbar: buildNavbar,
  "pricing-card": buildPricingCard,
  testimonial: buildTestimonial,
  "feature-card": buildFeatureCard,
  "cta-banner": buildCtaBanner,
  footer: buildFooter,
  "stats-row": buildStatsRow,
};

async function insertComponent(id: string) {
  const builder = BUILDERS[id];
  if (!builder) return;

  await ensureFonts();
  const node = builder();

  const viewport = figma.viewport.center;
  node.x = viewport.x - node.width / 2;
  node.y = viewport.y - node.height / 2;

  figma.currentPage.appendChild(node);
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.notify(`Inserted "${node.name}"`);
}

figma.ui.onmessage = (msg) => {
  if (msg.type === "insert") insertComponent(msg.id);
};
