export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_APP_NAME || "ForgeWise AI",
  // Empty = use same-origin /api/v1 (proxied by Next.js). Set only to call the API directly.
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, ""),
  version: "5.1.0",
  defaultLanguage: "en",
  supportedLanguages: ["en", "hi", "es", "de", "fr", "ja"] as const,
  languageNames: {
    en: "English",
    hi: "हिन्दी",
    es: "Español",
    de: "Deutsch",
    fr: "Français",
    ja: "日本語",
  } as Record<string, string>,
  safetyEscalationContact: "Plant EHS Control Desk (Ext: 4400)",
};
