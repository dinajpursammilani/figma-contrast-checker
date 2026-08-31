// UI-only gating — decides which admin screens/buttons even render. Not a security boundary by
// itself: the real enforcement is server-side (ADMIN_EMAILS checked inside
// sync-framer-components and upload-component-preview), so a mismatch here only hides/shows a
// button, it never grants or denies actual write access.
const ADMIN_EMAILS = ["suryadipta.sarkar00@gmail.com"]

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
