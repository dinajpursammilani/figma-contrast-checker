// TEMPORARY diagnostic — see how far we can push component recoloring (icons, text) before
// deciding it's not feasible. We need to see real svg markup / getText() HTML before writing
// any regex against it, since guessing has burned us before on this project (getParent,
// getSVGForNode, setPluginDataForNode all looked right and weren't). Delete once the recolor
// feature's scope is settled either way.
import { framer, isSVGNode, isTextNode, type CanvasNode } from "@framer/plugin"

async function collectDescendants(node: CanvasNode): Promise<CanvasNode[]> {
  const children = await framer.getChildren(node.id)
  const nested = await Promise.all(children.map(collectDescendants))
  return [node, ...children, ...nested.flat()]
}

export interface MarkupDump {
  svgSamples: { name: string | null; markup: string }[]
  textSamples: { name: string | null; html: string | null }[]
}

export async function dumpSelectedMarkup(): Promise<MarkupDump> {
  const selection = await framer.getSelection()
  const root = selection[0]
  if (!root) throw new Error("Select a component on the canvas first.")

  const nodes = await collectDescendants(root)

  const svgNodes = nodes.filter(isSVGNode)
  const textNodes = nodes.filter(isTextNode)

  const svgSamples = svgNodes.slice(0, 3).map((n) => ({ name: n.name, markup: n.svg }))
  const textSamples = await Promise.all(
    textNodes.slice(0, 3).map(async (n) => ({ name: n.name, html: await n.getText() }))
  )

  return { svgSamples, textSamples }
}
