import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `${siteConfig.brandName} — Industrial Multimodal Knowledge Assistant`,
  description:
    "Search Standard Operating Procedures, OEM manuals, engineering schematics, and expert maintenance knowledge through one grounded, bilingual AI copilot.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-base text-txt-primary">
        <ThemeProvider>
          <I18nProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
