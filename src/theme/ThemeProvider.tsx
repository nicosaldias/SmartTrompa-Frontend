"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_COOKIE, type Theme } from "./types";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function persistTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeProviderProps {
  initialTheme?: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? DEFAULT_THEME);

  // Mantiene el atributo data-theme del <html> sincronizado con el estado.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}
