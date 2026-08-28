import { framer } from "@framer/plugin"

/** Framer's setPluginData/getPluginData have been observed to hang indefinitely in some
 * plugin contexts instead of rejecting — never let a caller block forever on them. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

export async function getData(key: string): Promise<string | null> {
  return withTimeout(framer.getPluginData(key), 3000, null)
}

export function setDataInBackground(key: string, value: string | null) {
  if (!framer.isAllowedTo("setPluginData")) return
  withTimeout(framer.setPluginData(key, value), 3000, undefined).catch((err) => {
    console.warn(`Failed to persist plugin data for "${key}":`, err)
  })
}
