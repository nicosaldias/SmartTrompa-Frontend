import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { getServerLang } from "@/i18n/server";

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
  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
