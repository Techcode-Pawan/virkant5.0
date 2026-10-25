export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_APP_NAME || "ForgeWise AI",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  version: "5.0.0",
  defaultLanguage: "en",
  supportedLanguages: ["en", "hi", "es", "de", "fr", "ja"] as const,
  supportedModels: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google DeepMind", badge: "Fastest / Multimodal" },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", badge: "High Precision" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", badge: "Engineering Specialist" },
    { id: "ollama-industrial", name: "Ollama Llama-3", provider: "Local Edge", badge: "Air-Gapped" },
    { id: "forgewise-expert", name: "ForgeWise Core", provider: "Offline Deterministic", badge: "Zero-Key Mock" },
  ] as const,
  defaultTheme: "light",
  safetyEscalationContact: "Plant EHS Control Desk (Ext: 4400)",
};
