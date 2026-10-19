export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_APP_NAME || "ForgeWise AI",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  version: "1.0.0",
  defaultLanguage: "en",
  supportedLanguages: ["en", "hi"] as const,
  defaultTheme: "light",
  safetyEscalationContact: "Plant EHS Control Desk (Ext: 4400)",
};
