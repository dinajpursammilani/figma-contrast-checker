import { framer } from "@framer/plugin"

const TIER_KEY = "skela-tier"
const CATEGORY_KEY = "skela-category"

/** ComponentNode (a component *definition*) is not part of the CanvasNode union framer.getSelection()
 * returns — selecting an instance on canvas only gets you a ComponentInstanceNode, never the
 * definition itself. So instead of relying on canvas selection, this lists every real Component in
 * the project (same call sync.ts uses) and tags the one matching componentIdentifier directly. */
export async function listTaggableComponents(): Promise<{ id: string; name: string | null }[]> {
  const nodes = await framer.getNodesWithType("ComponentNode")
  return nodes.map((n) => ({ id: n.componentIdentifier, name: n.name }))
}

/** Tags a Component (by its stable componentIdentifier, not its name) with a tier/category,
 * stored as plugin data directly on the node — completely independent of its display name.
 * Confirmed live that this actually persists (unlike getSVGForNode/getParent, which looked
 * equally promising and didn't work), so renaming the component afterward can never affect this. */
export async function tagComponent(componentId: string, tier: "pro" | "free", category: string): Promise<string> {
  const nodes = await framer.getNodesWithType("ComponentNode")
  const component = nodes.find((n) => n.componentIdentifier === componentId)
  if (!component) throw new Error("Component not found — try refreshing the list.")

  await component.setPluginData(TIER_KEY, tier)
  await component.setPluginData(CATEGORY_KEY, category.trim() || null)
  return component.name ?? "component"
}

export async function getComponentTag(component: {
  getPluginData: (key: string) => Promise<string | null>
}): Promise<{ tier: "pro" | "free" | null; category: string | null }> {
  const [tier, category] = await Promise.all([
    component.getPluginData(TIER_KEY),
    component.getPluginData(CATEGORY_KEY),
  ])
  return { tier: tier === "pro" || tier === "free" ? tier : null, category }
}
