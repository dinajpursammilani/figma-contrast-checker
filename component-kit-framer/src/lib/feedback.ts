import { supabase } from "./supabase"

export type FeedbackType = "feedback" | "bug"

/** Insert-only from the client — RLS lets a user write their own row but never read any back.
 * Replaces the old mailto: links so submitting doesn't depend on the user having a mail client
 * configured, and gives us a real record instead of whatever ends up in someone's Sent folder. */
export async function submitFeedback(type: FeedbackType, message: string, userId: string, userEmail: string | null): Promise<void> {
  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: userId,
    user_email: userEmail,
    type,
    message: message.trim(),
  })
  if (error) throw new Error(error.message)
}
