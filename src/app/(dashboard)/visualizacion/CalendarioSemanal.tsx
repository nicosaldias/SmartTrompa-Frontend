"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/api/client";
import type { Trabajador, JornadaTrabajo, AlertaHistorial } from "@/types";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { nivelColor } from "@/utils/alertaTokens";
import { formatFecha, formatHora } from "@/utils/fechas";
import {
  bloqueDeJornada,
  colorSupervisor,
  duracionMinutos,
  formatDuracion,
  rangoHorario,
  rangoSemana,
} from "@/utils/historicoCuadrilla";
import EmptyState from "@/components/EmptyState";

interface Props {
  trabajadores: Trabajador[];
  /** Filtro de supervisor heredado de la vista (mismo valor del select). */
  filterSupervisor: string;
}

const DIA_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Vista calendario del histórico: una semana lunes-domingo con eje horario
 * derivado de los datos. Cada jornada terminada es un bloque inicio→fin con
 * color estable por supervisor y marca roja si tuvo alertas; el clic abre el
 * detalle bajo la grilla. Sin librerías: CSS grid + posicionamiento %.
 */
export default function CalendarioSemanal({ trabajadores, filterSupervisor }: Props) {
  const t = useT();
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>([]);
  const [alertas, setAlertas] = useState<AlertaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [seleccionada, setSeleccionada] = useState<JornadaTrabajo | null>(null);

  // La semana se congela por render (hoy no cambia dentro de la sesión de vista).
  const semana = useMemo(() => rangoSemana(new Date(), offset), [offset]);

  const findTrabajador = (rut: string): Trabajador | undefined =>
    trabajadores.find((tr) => tr.rut === rut);

  const nombreDe = (rut?: string): string => {
    if (!rut) return "—";
    const tr = findTrabajador(rut);
    return tr ? `${tr.nombre} ${tr.apellidoPaterno}` : rut;
  };

  const fetchSeq = useRef(0);
  const fetchSemana = useCallback(async (desde: string, hasta: string, sup: string) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setLoadError(false);
    try {
      // Una semana acotada cabe en una página grande; 500 cubre con holgura
      // el volumen real (~decenas de jornadas/semana).
      const page = await api.jornadas.historial(0, 500, {
        inicio: desde,
        fin: hasta,
        ...(sup ? { supervisor: sup } : {}),
      });
      const contenido = (page.content || []).filter((j) => j.terminada);
      const ids = contenido.map((j) => j.id).filter((id): id is number => id != null);
      const jAlertas = ids.length > 0 ? await api.alertas.porJornadas(ids) : [];
      if (seq !== fetchSeq.current) return;
      setJornadas(contenido);
      setAlertas(jAlertas);
      setSeleccionada(null);
    } catch {
      if (seq !== fetchSeq.current) return;
      setLoadError(true);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemana(semana.desde, semana.hasta, filterSupervisor);
  }, [semana, filterSupervisor, fetchSemana]);

  const { hMin, hMax } = rangoHorario(jornadas);
  const horas = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i);

  const alertasDeJornada = (j: JornadaTrabajo): AlertaHistorial[] =>
    alertas.filter((a) => a.jornadaId === j.id && a.nivel !== "OK");

  const jornadasDelDia = (dia: Date): JornadaTrabajo[] =>
    jornadas.filter((j) => {
      const ini = new Date(j.inicio);
      return (
        ini.getFullYear() === dia.getFullYear() &&
        ini.getMonth() === dia.getMonth() &&
        ini.getDate() === dia.getDate()
      );
    });

  // Supervisores presentes en la semana (para la leyenda de colores).
  const supervisoresSemana = useMemo(() => {
    const ruts = [...new Set(jornadas.map((j) => j.idSupervisor).filter(Boolean))] as string[];
    return ruts;
  }, [jornadas]);

  const ALTO_GRILLA = 480;

  return (
    <div>
      {/* Navegación de semana */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <button
          className="btn-secondary"
          onClick={() => setOffset(offset - 1)}
          disabled={loading}
          aria-label={t("visualizacion.prevWeek")}
          style={{ display: "flex", alignItems: "center", padding: "0.375rem 0.625rem" }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, minWidth: 240, textAlign: "center" }}>
          {formatFecha(semana.dias[0].toISOString())} — {formatFecha(semana.dias[6].toISOString())}
        </span>
        <button
          className="btn-secondary"
          onClick={() => setOffset(offset + 1)}
          disabled={loading || offset >= 0}
          aria-label={t("visualizacion.nextWeek")}
          style={{ display: "flex", alignItems: "center", padding: "0.375rem 0.625rem" }}
        >
          <ChevronRight size={16} />
        </button>
        {offset !== 0 && (
          <button
            className="btn-secondary"
            onClick={() => setOffset(0)}
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
          >
            {t("visualizacion.currentWeek")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
          {t("visualizacion.loadingHistory")}
        </div>
      ) : loadError ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.5rem" }}>
            {t("visualizacion.errorLoadHistory")}
          </p>
          <button
            className="btn-secondary"
            style={{ fontSize: "0.85rem" }}
            onClick={() => fetchSemana(semana.desde, semana.hasta, filterSupervisor)}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : jornadas.length === 0 ? (
        <EmptyState title={t("visualizacion.noResults")} hint={t("visualizacion.emptyWeek")} />
      ) : (
        <>
          {/* Leyenda de supervisores */}
          {supervisoresSemana.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem", justifyContent: "center" }}>
              {supervisoresSemana.map((rut) => (
                <span key={rut} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colorSupervisor(rut), display: "inline-block" }} />
                  {nombreDe(rut)}
                </span>
              ))}
            </div>
          )}

          {/* Grilla semanal */}
          <div className="card" style={{ padding: "0.75rem", overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7, 1fr)", gap: 2, minWidth: 640 }}>
              {/* Cabecera de días */}
              <div />
              {semana.dias.map((dia, i) => {
                const esHoy = new Date().toDateString() === dia.toDateString();
                return (
                  <div key={dia.toISOString()} style={{ textAlign: "center", paddingBottom: "0.375rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                      {DIA_LABELS[i]}
                    </p>
                    <p style={{
                      fontSize: "0.85rem", fontWeight: esHoy ? 800 : 600,
                      color: esHoy ? "var(--color-accent)" : "var(--color-text-primary)",
                    }}>
                      {dia.getDate()}
                    </p>
                  </div>
                );
              })}

              {/* Eje horario */}
              <div style={{ position: "relative", height: ALTO_GRILLA }}>
                {horas.map((h) => (
                  <span
                    key={h}
                    style={{
                      position: "absolute",
                      top: `${((h - hMin) / (hMax - hMin)) * 100}%`,
                      right: 6,
                      transform: "translateY(-50%)",
                      fontSize: "0.6rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>

              {/* Columnas por día */}
              {semana.dias.map((dia) => (
                <div
                  key={`col-${dia.toISOString()}`}
                  style={{
                    position: "relative",
                    height: ALTO_GRILLA,
                    borderRadius: 6,
                    backgroundColor: "var(--color-bg-secondary)",
                    backgroundImage:
                      `repeating-linear-gradient(to bottom, transparent, transparent calc(${100 / (hMax - hMin)}% - 1px), var(--color-border) calc(${100 / (hMax - hMin)}% - 1px), var(--color-border) ${100 / (hMax - hMin)}%)`,
                  }}
                >
                  {jornadasDelDia(dia).map((j) => {
                    const { topPct, heightPct } = bloqueDeJornada(j, hMin, hMax);
                    const color = colorSupervisor(j.idSupervisor || "sin-supervisor");
                    const nAlertas = alertasDeJornada(j).length;
                    const esSeleccionada = seleccionada?.id === j.id;
                    return (
                      <button
                        key={j.id}
                        onClick={() => setSeleccionada(esSeleccionada ? null : j)}
                        title={`${nombreDe(j.rutUsuario)} · ${formatHora(j.inicio)}–${j.fin ? formatHora(j.fin) : "—"}${nAlertas > 0 ? ` · ${nAlertas} ⚠` : ""}`}
                        style={{
                          position: "absolute",
                          top: `${topPct}%`,
                          height: `${heightPct}%`,
                          left: 2,
                          right: 2,
                          borderRadius: 4,
                          backgroundColor: `${color}cc`,
                          border: esSeleccionada
                            ? "2px solid var(--color-text-primary)"
                            : nAlertas > 0 ? "2px solid #ef4444" : `1px solid ${color}`,
                          cursor: "pointer",
                          padding: "1px 3px",
                          overflow: "hidden",
                          textAlign: "left",
                          color: "#fff",
                          fontSize: "0.58rem",
                          fontWeight: 700,
                          lineHeight: 1.1,
                        }}
                      >
                        {heightPct > 4 && nombreDe(j.rutUsuario)}
                        {nAlertas > 0 && heightPct > 8 && (
                          <span style={{ display: "block", fontWeight: 800 }}>⚠ {nAlertas}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Detalle de la jornada seleccionada */}
          {seleccionada && (
            <div className="card" style={{ marginTop: "1rem", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {nombreDe(seleccionada.rutUsuario)}
                    <span style={{ color: "var(--color-text-secondary)", fontWeight: 400, fontSize: "0.8rem" }}>
                      {" "}· {seleccionada.rutUsuario}
                    </span>
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                    {formatFecha(seleccionada.inicio)} · {formatHora(seleccionada.inicio)}
                    {seleccionada.fin ? ` – ${formatHora(seleccionada.fin)}` : ""} ·{" "}
                    {formatDuracion(duracionMinutos(seleccionada.inicio, seleccionada.fin))}
                    {" · "}{t("roles.supervisor")}: {nombreDe(seleccionada.idSupervisor)}
                  </p>
                </div>
                <button
                  onClick={() => setSeleccionada(null)}
                  aria-label={t("common.cancel")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
                >
                  <X size={16} />
                </button>
              </div>
              {alertasDeJornada(seleccionada).length > 0 ? (
                <div style={{ marginTop: "0.625rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {alertasDeJornada(seleccionada).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/historial-alertas/${a.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "0.78rem", color: "var(--color-text-primary)", padding: "0.125rem 0",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: nivelColor(a.nivel), flexShrink: 0 }} />
                      {formatHora(a.timestamp)} · {a.tipo} · {a.nivel}
                      <ChevronRight size={12} style={{ color: "var(--color-accent)" }} />
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#22c55e" }}>
                  {t("visualizacion.noAlertsShift")}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
