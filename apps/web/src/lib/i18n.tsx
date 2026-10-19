"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import enMessages from "../messages/en.json";
import hiMessages from "../messages/hi.json";

export type LanguageCode = "en" | "hi";

type MessagesType = typeof enMessages;

interface I18nContextType {
  locale: LanguageCode;
  setLocale: (lang: LanguageCode) => void;
  t: (path: string) => string;
  messages: MessagesType;
}

const translations: Record<LanguageCode, MessagesType> = {
  en: enMessages,
  hi: hiMessages as unknown as MessagesType,
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (path: string) => path,
  messages: enMessages,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>("en");

  useEffect(() => {
    const saved = localStorage.getItem("forgewise_lang") as LanguageCode | null;
    if (saved && (saved === "en" || saved === "hi")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (lang: LanguageCode) => {
    setLocaleState(lang);
    localStorage.setItem("forgewise_lang", lang);
  };

  const t = (path: string): string => {
    const keys = path.split(".");
    let current: any = translations[locale];
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback: any = translations.en;
        for (const fKey of keys) {
          if (fallback && typeof fallback === "object" && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            return path;
          }
        }
        return typeof fallback === "string" ? fallback : path;
      }
    }
    return typeof current === "string" ? current : path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, messages: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
