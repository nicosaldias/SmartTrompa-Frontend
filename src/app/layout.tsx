import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { getServerLang } from "@/i18n/server";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from "@/theme/types";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export const metadata: Metadata = {
  title: "SIMOR | Sistema de Monitoreo para Respiradores",
  description: "Plataforma de monitoreo de seguridad industrial para trabajadores con equipos de proteccion respiratoria",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;
  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider initialTheme={theme}>
          <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
