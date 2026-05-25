"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { dictionaries } from "./dictionaries";
import {
  COOKIE_NAME,
  DEFAULT_LANG,
  isLang,
  type Dictionary,
  type Lang,
  type TranslationKey,
} from "./types";

export type TParams = Record<string, string | number>;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dict: Dictionary;
  t: (key: TranslationKey, params?: TParams, fallback?: string) => string;
}

function interpolate(template: string, params: TParams): string {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveKey(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let cursor: unknown = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cursor === "string" ? cursor : undefined;
}

function persistLang(lang: Lang) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=${lang}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
  if (document.documentElement.lang !== lang) {
    document.documentElement.lang = lang;
  }
}

interface LanguageProviderProps {
  initialLang?: Lang;
  children: React.ReactNode;
}

export function LanguageProvider({ initialLang, children }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? DEFAULT_LANG);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = dictionaries[lang] ?? dictionaries[DEFAULT_LANG];
    return {
      lang,
      setLang,
      dict,
      t: (key, params, fallback) => {
        const raw = resolveKey(dict, key) ?? fallback ?? key;
        return params ? interpolate(raw, params) : raw;
      },
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within <LanguageProvider>");
  }
  return ctx;
}

export function useT(): LanguageContextValue["t"] {
  return useLanguage().t;
}

export { isLang };
