// Keep this in sync with legal/skela-terms-and-privacy.md — that file is what gets sent out
// for review/signoff; this is the same text rendered inside the plugin itself so it never needs
// external hosting (Supabase Storage can't reliably serve real HTML pages — see the
// abandoned static-pages bucket attempt).
export const LAST_UPDATED = "September 2, 2026"
export const SUPPORT_CONTACT = "dominik@fackt.io"

export interface LegalSection {
  heading: string
  body: string[]
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. What Skela is",
    body: [
      "Skela is a Framer plugin that lets you browse and insert pre-built design components into your Framer projects. Some components are free; others require a Pro upgrade.",
    ],
  },
  {
    heading: "2. Accounts",
    body: [
      "You need an account (email/password or Google sign-in) to use Skela. You're responsible for keeping your login secure and for all activity under your account.",
    ],
  },
  {
    heading: "3. Component license",
    body: [
      "When you insert a component from Skela into your project, you're granted a non-exclusive, non-transferable license to use it in unlimited personal and commercial/client projects, including modifying and combining it with other work. You may not:",
      "• Resell or redistribute the components — modified or not — on any marketplace or through any private channel",
      "• Share editable source files with anyone outside your own project team",
      "• Reverse-engineer or extract components to build a competing product or plugin",
      "• Share your Pro account access with others",
    ],
  },
  {
    heading: "4. Payment & refunds",
    body: [
      "Pro access is a paid upgrade processed through Polar, our payment provider. Refunds are not issued right now. Skela is treated as a non-returnable digital good once access is granted.",
    ],
  },
  {
    heading: "5. Termination",
    body: [
      "We may suspend or terminate your account without refund if we suspect a violation of these Terms, without obligation to explain why.",
    ],
  },
  {
    heading: "6. Liability",
    body: [
      'Skela is provided "as is," with no warranty of any kind. To the maximum extent permitted by law, our total liability to you for any claim is capped at the amount you paid us in the past 12 months.',
    ],
  },
  {
    heading: "7. Changes",
    body: ["We may update these Terms or the plugin itself at any time. Continued use after changes means you accept the updated Terms."],
  },
  {
    heading: "8. Contact",
    body: [`Questions? Reach us at ${SUPPORT_CONTACT}.`],
  },
]

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "What we collect",
    body: [
      "• Account info: your email address, and your name if you provide it (email signup or Google sign-in)",
      "• Usage data: which components you save, boards you create, and — for admin accounts only — sync activity",
      "• Payment info: handled entirely by Polar, our payment processor. We never see or store your card details directly",
      "We do not use analytics or tracking cookies of any kind. There is no ad tracking, no heatmaps, no third-party analytics script anywhere in Skela.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "• To run your account and remember your saved components/boards",
      "• To process Pro upgrades and verify your subscription status",
      "• To respond if you contact support",
    ],
  },
  {
    heading: "Third parties we use",
    body: [
      "Only what's needed to run the service — nothing else:",
      "• Supabase — hosts our database and handles authentication",
      "• Polar — processes payments; they never share your full card details with us",
      "• Google — only if you choose Google sign-in",
      "We don't sell your data, and we don't share it with anyone beyond these three providers.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      `You can request account deletion at any time by contacting ${SUPPORT_CONTACT}. Deleting your account removes your saved boards and profile data.`,
    ],
  },
  {
    heading: "Contact",
    body: [SUPPORT_CONTACT],
  },
]
