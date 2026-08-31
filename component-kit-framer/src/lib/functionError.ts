import { FunctionsHttpError } from "@supabase/supabase-js"

/** supabase-js's default error.message for a non-2xx Edge Function response is just "Edge
 * Function returned a non-2xx status code" — it doesn't read the response body. Our functions
 * always return { error: "..." } on failure, so read that out instead when possible. */
export async function describeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === "string") return body.error
    } catch {
      // fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : "Request failed"
}
