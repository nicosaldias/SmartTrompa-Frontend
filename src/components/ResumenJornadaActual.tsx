"use client";

import { Activity } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { contarNivelesFiltro } from "@/utils/sensorMappings";
import type { AlertaHistorial, JornadaTrabajo, MedicionesAmbientales } from "@/types";

interface Props {
  jornadas: JornadaTrabajo[];
  medicionesMap: Record<string, MedicionesAmbientales | null>;
  alertas: AlertaHistorial[];
  /** Margen inferior; se puede anular por página. */
  marginBottom?: string;
}

/**
 * "Resumen Jornada Actual" — bloque de 5 tarjetas compartido por las páginas
 * Resumen y Estado de Cuadrilla, para que ambas muestren lo mismo:
 * Trabajadores Activos, Frec. Respiratoria, Desajustes, Saturación filtro, Batería.
 */
export default function ResumenJornadaActual({ jornadas, medicionesMap, alertas, marginBottom = "2rem" }: Props) {
  const t = useT();

  const medValues = Object.values(medicionesMap).filter(
    (m): m is MedicionesAmbientales => m !== null
  );

  const frecValues = medValues.filter((m) => m.frecuenciaRespiratoria != null);
  const avgFrec = frecValues.length > 0
    ? Math.round(frecValues.reduce((sum, m) => sum + (m.frecuenciaRespiratoria ?? 0), 0) / frecValues.length)
    : null;

  // Convencion D3: 0 = desajustado (la de la app movil).
  const desajusteCount = medValues.filter((m) => m.nivelAjuste === 0).length;

  // Misma fuente que la columna Filtro de la tabla (alertas activas), para que
  // esta tarjeta nunca contradiga esa columna. Ojo: "Desajustes" sigue contando
  // mediciones (nivelAjuste) — patron de dos fuentes pendiente de unificar.
  const filtroCounts = contarNivelesFiltro(jornadas, alertas);

  const bateriaValues = medValues.filter((m) => m.bateria != null).map((m) => m.bateria!);
  const avgBateria = bateriaValues.length > 0
    ? Math.round(bateriaValues.reduce((a, b) => a + b, 0) / bateriaValues.length)
    : null;

  // Sin jornadas activas NO hay vigilancia que reportar: mostrar "—" neutro en
  // vez de ceros en verde (un 0 verde junto a filtros vencidos transmite una
  // tranquilidad que nadie midió).
  const sinJornadas = jornadas.length === 0;

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-secondary)",
    marginBottom: "0.5rem",
  };
  const cardStyle: React.CSSProperties = { textAlign: "center", padding: "1.25rem 1rem" };

  return (
    <>
      <h2 style={{
        marginBottom: "1rem",
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "var(--color-text-secondary)",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>
        <Activity size={14} />
        {t("resumen.currentShiftSummary")}
      </h2>

      <div className="resumen-sensor-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom }}>
        {/* Trabajadores Activos */}
        <div className="card resumen-sensor-card" style={cardStyle}>
          <p style={labelStyle}>{t("resumen.activeWorkers")}</p>
          {/* Única de las cinco tarjetas del strip pintada con el acento; las otras usan
              --color-text-primary. En tema claro medía 2.80:1 sobre .card, así que el dato
              destacado del dashboard era el peor contrastado de la fila. */}
          <p className="resumen-sensor-value" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-accent-text)" }}>
            {jornadas.length}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>{t("resumen.onShift")}</p>
        </div>

        {/* Frec. Respiratoria */}
        <div className="card resumen-sensor-card" style={cardStyle}>
          <p style={labelStyle}>{t("resumen.respiratoryRate")}</p>
          <p className="resumen-sensor-value" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            {avgFrec != null ? `${avgFrec}` : "--"}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>{t("resumen.bpmAverage")}</p>
        </div>

        {/* Desajustes */}
        <div className="card resumen-sensor-card" style={cardStyle}>
          <p style={labelStyle}>{t("resumen.misfits")}</p>
          <p className="resumen-sensor-value" style={{
            fontSize: "2rem", fontWeight: 800,
            color: sinJornadas ? "var(--color-text-secondary)"
              : desajusteCount > 0 ? "#ef4444" : "#22c55e",
          }}>
            {sinJornadas ? "—" : desajusteCount}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>
            {sinJornadas ? t("resumen.noShiftData") : t("resumen.workers")}
          </p>
        </div>

        {/* Saturación filtro */}
        <div className="card resumen-sensor-card" style={cardStyle}>
          <p style={labelStyle}>{t("resumen.filterSaturation")}</p>
          {sinJornadas ? (
            <p className="resumen-sensor-value" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-secondary)" }}>—</p>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", fontSize: "1.1rem", fontWeight: 700, paddingTop: "0.35rem" }}>
              <span style={{ color: "#22c55e" }}>{filtroCounts.bajo}</span>
              <span style={{ color: "#f59e0b" }}>{filtroCounts.medio}</span>
              <span style={{ color: "#ef4444" }}>{filtroCounts.alto}</span>
            </div>
          )}
          <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            {sinJornadas ? t("resumen.noShiftData") : t("resumen.saturationLevels")}
          </p>
        </div>

        {/* Batería sensores */}
        <div className="card resumen-sensor-card" style={cardStyle}>
          <p style={labelStyle}>{t("resumen.sensorBattery")}</p>
          <p className="resumen-sensor-value" style={{ fontSize: "2rem", fontWeight: 800, color: avgBateria != null && avgBateria < 20 ? "#ef4444" : "var(--color-text-primary)" }}>
            {avgBateria != null ? `${avgBateria}%` : "--"}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>{t("resumen.average")}</p>
        </div>
      </div>

      {/* Responsive del bloque compartido: vive aquí para aplicar en TODAS las
          páginas que lo usan (Resumen y Estado de Cuadrilla), no solo en una. */}
      <style>{`
        @media (max-width: 1024px) {
          .resumen-sensor-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }
        }
        @media (max-width: 768px) {
          .resumen-sensor-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
          .resumen-sensor-card {
            padding: 1rem 0.75rem !important;
          }
          .resumen-sensor-value {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
    </>
  );
}
