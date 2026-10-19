"use client";

import React, { useState } from "react";
import { Sun, Moon, Contrast, Languages, Shield, Check } from "lucide-react";
import { useTranslation, LanguageCode } from "@/lib/i18n";
import { useTheme, ThemeMode } from "@/lib/theme";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          {t("settings.title")}
        </h1>
        <p className="text-xs text-txt-muted mt-1">
          Customize plant floor interface language, high-contrast display modes, and voice accessibility.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-6 shadow-xs">
        {/* Language Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted">
            {t("settings.language")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLocale("en")}
              className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                locale === "en"
                  ? "border-teal bg-teal/5 text-txt-primary shadow-xs"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <div className="font-semibold text-sm">English</div>
              <div className="text-[11px] text-txt-muted mt-0.5">Primary engineering locale</div>
            </button>

            <button
              onClick={() => setLocale("hi")}
              className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                locale === "hi"
                  ? "border-teal bg-teal/5 text-txt-primary shadow-xs"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <div className="font-semibold text-sm">हिंदी (Hindi)</div>
              <div className="text-[11px] text-txt-muted mt-0.5">मानक औद्योगिक शब्दावली सहित</div>
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="space-y-3 pt-4 border-t border-border-subtle">
          <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted">
            {t("settings.theme")}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`p-3 rounded-lg border text-left transition-colors ${
                theme === "light"
                  ? "border-teal bg-teal/5 text-txt-primary shadow-xs"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Sun className="h-4 w-4 mb-2 text-txt-primary" />
              <div className="font-semibold text-xs">{t("settings.light")}</div>
              <div className="text-[10px] text-txt-muted">Clean paper white</div>
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`p-3 rounded-lg border text-left transition-colors ${
                theme === "dark"
                  ? "border-teal bg-teal/5 text-txt-primary shadow-xs"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Moon className="h-4 w-4 mb-2 text-txt-primary" />
              <div className="font-semibold text-xs">{t("settings.dark")}</div>
              <div className="text-[10px] text-txt-muted">Low light control room</div>
            </button>

            <button
              onClick={() => setTheme("high-contrast")}
              className={`p-3 rounded-lg border text-left transition-colors ${
                theme === "high-contrast"
                  ? "border-warning bg-warning/10 text-txt-primary shadow-xs"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Contrast className="h-4 w-4 mb-2 text-warning" />
              <div className="font-semibold text-xs">{t("settings.highContrast")}</div>
              <div className="text-[10px] text-txt-muted">Direct sun / glove safety</div>
            </button>
          </div>
        </div>

        {/* Save confirmation button */}
        <div className="pt-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand text-xs font-semibold text-white shadow-xs hover:opacity-90"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 text-success" />
                <span>Preferences Saved</span>
              </>
            ) : (
              <span>{t("settings.save")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
