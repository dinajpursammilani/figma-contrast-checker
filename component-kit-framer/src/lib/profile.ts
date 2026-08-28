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
