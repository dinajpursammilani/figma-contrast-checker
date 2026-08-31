import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export async function uploadComponentPreview(componentId: string, file: File): Promise<string> {
  const form = new FormData()
  form.append("componentId", componentId)
  form.append("file", file)

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "upload-component-preview",
    { body: form }
  )
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.url) throw new Error(data?.error ?? "Upload failed")
  return data.url
}
