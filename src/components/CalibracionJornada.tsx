"use client";

import { useState } from "react";
import { Gauge, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/api/client";
import type { CalibracionIntento, JornadaTrabajo } from "@/types";
import { resumenCalibracion } from "@/utils/calibracion";
import { useT } from "@/i18n/LanguageProvider";
import { formatHora } from "@/utils/fechas";

/**
 * Resumen de la calibración pre-jornada ("Calibró al intento 3", "Omitida sin
 * intentos", "Sin registro"…) con el detalle por intento bajo demanda: el GET
 * /calibracion-intentos/ se dispara recién al expandir y se cachea en el
 * estado del componente, para no sumar N peticiones al render del historial.
 */
export default function CalibracionJornada({ jornada }: { jornada: JornadaTrabajo }) {
  const t = useT();
  const resumen = resumenCalibracion(jornada);

  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [intentos, setIntentos] = useState<CalibracionIntento[] | null>(null);

  async function toggle() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (!siguiente || intentos !== null || cargando) return;
    setCargando(true);
    setError(false);
    try {
      const data = await api.jornadas.calibracionIntentos(jornada.id);
      // El backend ya ordena por numero; se reordena defensivamente.
      setIntentos([...data].sort((a, b) => a.numero - b.numero));
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }

  // Omitida = advertencia (--color-yellow trae variante clara y oscura);
  // el resto queda en el gris secundario para no competir con las alertas.
  const colorResumen = resumen.omitida ? "var(--color-yellow)" : "var(--color-text-secondary)";

  return (
    <div style={{ marginTop: "0.375rem", fontSize: "0.68rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            color: colorResumen,
            fontWeight: resumen.omitida ? 700 : 600,
            fontStyle: resumen.sinRegistro ? "italic" : undefined,
          }}
        >
          <Gauge size={12} /> {t(resumen.key, resumen.params)}
        </span>
        {resumen.tieneIntentos && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void toggle();
            }}
            aria-expanded={abierto}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.125rem",
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--color-accent-text)",
            }}
          >
            {abierto ? t("calibracion.ocultarIntentos") : t("calibracion.verIntentos")}
            {abierto ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {abierto && (
        <div style={{ marginTop: "0.375rem" }}>
          {cargando ? (
            <p style={{ color: "var(--color-text-secondary)" }}>{t("calibracion.cargandoIntentos")}</p>
          ) : error ? (
            <p style={{ color: "var(--color-red)" }}>{t("calibracion.errorIntentos")}</p>
          ) : !intentos || intentos.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>{t("calibracion.sinDetalleIntentos")}</p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: "0.375rem 0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                borderLeft: "2px solid var(--color-border)",
              }}
            >
              {intentos.map((intento) => (
                <li key={intento.numero} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.375rem" }}>
                  <span style={{ fontWeight: 700 }}>{t("calibracion.intentoN", { n: intento.numero })}</span>
                  <span className={`badge ${intento.exitosa ? "badge-green" : "badge-red"}`}>
                    {intento.exitosa ? t("calibracion.exitosa") : t("calibracion.fallida")}
                  </span>
                  {intento.iniciadoEn && (
                    <span style={{ color: "var(--color-text-secondary)" }}>{formatHora(intento.iniciadoEn)}</span>
                  )}
                  {intento.duracionMs != null && (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {t("calibracion.duracionSegundos", { s: (intento.duracionMs / 1000).toFixed(1) })}
                    </span>
                  )}
                  {intento.exitosa && intento.vcalPa != null && (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {t("calibracion.vcalPa", { v: intento.vcalPa.toFixed(1) })}
                    </span>
                  )}
                  {intento.rangoPa != null && (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {t("calibracion.rangoPa", { v: intento.rangoPa.toFixed(1) })}
                    </span>
                  )}
                  {!intento.exitosa && intento.motivoDescarte && (
                    <span style={{ flexBasis: "100%", color: "var(--color-text-secondary)" }}>
                      {intento.motivoDescarte}
                    </span>
                  )}
                  {intento.avisos && (
                    <span style={{ flexBasis: "100%", color: "var(--color-yellow)" }}>
                      {t("calibracion.avisosLabel")}: {intento.avisos}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
