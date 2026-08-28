import { supabase } from "./supabase"

export interface OnboardingAnswers {
  building: string[]
  skill: string
  source: string
  usage: string
  describes: string
  role: string
}

export async function getOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("onboarding_completed").eq("id", userId).single()

  if (error) {
    console.warn("Failed to read onboarding status:", error.message)
    return false
  }
  return data?.onboarding_completed ?? false
}

export async function completeOnboarding(userId: string, answers: OnboardingAnswers): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, onboarding_answers: answers, updated_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) {
    console.warn("Failed to save onboarding completion:", error.message)
  }
}

export async function getFullName(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("full_name").eq("id", userId).single()
  if (error) return null
  return data?.full_name ?? null
}

/** Falls back to a cleaned-up guess from the email's local part when no name is set yet —
 * e.g. "jordan.lee92@gmail.com" -> "Jordan". Replaced once a real account page lets users
 * set their actual name. */
export function friendlyNameFromEmail(email: string): string {
  const local = email.split("@")[0]
  const cleaned = local.replace(/[0-9._-]+$/g, "").split(/[._-]/)[0]
  if (!cleaned) return "there"
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}
