"use client";

import { useT } from "@/i18n/LanguageProvider";

/**
 * Error boundary del segmento dashboard. Captura fallos lanzados durante el
 * render de los Server Components (p. ej. una petición de datos que falla).
 *
 * La autenticación la resuelve el middleware ANTES de renderizar: si la sesión
 * está muerta, redirige al login y esta página nunca se monta. Por eso un error
 * aquí es de datos, no de sesión, y mostramos un estado de error con reintento
 * en vez de expulsar al usuario al login.
 */
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>&#9888;&#65039;</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
          {t("common.unexpectedError")}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          {t("common.errorLoadingSection")}
        </p>
        <button onClick={() => reset()} className="btn-primary" style={{ padding: "0.75rem 2rem" }}>
          {t("common.tryAgain")}
        </button>
      </div>
    </div>
  );
}
