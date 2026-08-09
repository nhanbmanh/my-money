"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import viDict from "@/locales/vi.json";
import enDict from "@/locales/en.json";

export type Language = "vi" | "en";

type Dictionary = typeof viDict;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "vi",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

const dictionaries: Record<Language, any> = {
  vi: viDict,
  en: enDict,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    // Default to Vietnamese for current release
    setLanguageState("vi");
    localStorage.setItem("app-language", "vi");
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const nextLang = language === "vi" ? "en" : "vi";
    setLanguage(nextLang);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split(".");
      let val: any = dictionaries[language];

      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }

      // Fallback to Vietnamese if translation missing in English
      if (val === undefined && language !== "vi") {
        let fallbackVal: any = dictionaries.vi;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        val = fallbackVal;
      }

      if (typeof val !== "string") {
        return key;
      }

      if (params) {
        Object.entries(params).forEach(([pKey, pVal]) => {
          val = val.replace(new RegExp(`{{\\s*${pKey}\\s*}}`, "g"), String(pVal));
        });
      }

      return val;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
