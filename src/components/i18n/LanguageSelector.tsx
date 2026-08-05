"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import type { Lang } from "@/i18n/types";

type Variant = "pill" | "compact";

interface LanguageSelectorProps {
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
}

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
];

export default function LanguageSelector({
  variant = "pill",
  className,
  style,
}: LanguageSelectorProps) {
  const { lang, setLang, t } = useLanguage();

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: variant === "compact" ? 2 : 4,
    padding: 4,
    borderRadius: 999,
    background: "var(--color-bg-primary)",
    border: "1px solid var(--color-border)",
    ...style,
  };

  return (
    <div
      className={className}
      style={base}
      role="group"
      aria-label={t("language.label")}
    >
      {OPTIONS.map((opt) => {
        const isActive = opt.value === lang;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            aria-pressed={isActive}
            aria-label={`${t("language.switchTo")} ${
              opt.value === "es" ? t("language.spanish") : t("language.english")
            }`}
            style={{
              padding: variant === "compact" ? "0.2rem 0.55rem" : "0.3rem 0.75rem",
              fontSize: variant === "compact" ? "0.65rem" : "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderRadius: 999,
              border: "none",
              cursor: isActive ? "default" : "pointer",
              background: isActive ? "var(--color-accent, #f97316)" : "transparent",
              // La píldora activa es el relleno naranja, igual en ambos temas: con #fff
              // el par daba 2.80:1 y con --color-on-accent da 5.91:1. Es el único
              // indicador de qué idioma está puesto (aria-pressed aparte), así que
              // tiene que leerse, y a 0.65rem/700 sigue contando como texto normal.
              color: isActive ? "var(--color-on-accent, #1a1f26)" : "var(--color-text-secondary)",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
