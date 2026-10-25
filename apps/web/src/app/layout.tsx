import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { SessionProvider } from "@/lib/session";
import { siteConfig } from "@/lib/config";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: siteConfig.brandName, template: `%s | ${siteConfig.brandName}` },
  description:
    "Grounded AI assistant for SOPs, OEM manuals and maintenance knowledge, with chat, hands-free voice and page-level citations.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f1318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-base text-txt-primary antialiased">
        <ThemeProvider>
          <I18nProvider>
            <SessionProvider>{children}</SessionProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
