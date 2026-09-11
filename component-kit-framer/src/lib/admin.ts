// UI-only gating — decides which admin screens/buttons even render. Not a security boundary by
// itself: the real enforcement is server-side (ADMIN_EMAILS/SUPER_ADMIN_EMAILS checked inside
// sync-framer-components, upload-component-preview, admin-update-component, and
// admin-update-app-settings), so a mismatch here only hides/shows a button, it never grants or
// denies actual write access.
//
// Two tiers: SUPER_ADMIN_EMAILS is you (Fackt Labs' own dev account) — it gets delete-component
// and the ui_opacity slider, neither of which render at all for a plain admin, including the
// client. ADMIN_EMAILS is everyone who should see the regular Admin section (client included).
const SUPER_ADMIN_EMAILS = ["suryadipta.sarkar00@gmail.com"]
const ADMIN_EMAILS = [...SUPER_ADMIN_EMAILS, "dominik@fackt.io", "gremlin.sarkar@gmail.com"]

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
