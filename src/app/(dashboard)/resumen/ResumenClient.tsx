"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/api/client";
import type { JornadaTrabajo, AlertaHistorial, TipoAlerta, NivelAlerta, MedicionesAmbientales } from "@/types";
import { Activity, AlertTriangle, Battery, Wifi, Wind, Wrench, Hourglass, Clock, RefreshCw, ChevronRight, Radio } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import ResumenJornadaActual from "@/components/ResumenJornadaActual";
import { useRealtime, useRealtimeStatus } from "@/realtime/RealtimeProvider";
import type { MedicionesEventMsg } from "@/realtime/events";
import { TIPO_COLORS, NIVEL_COLORS } from "@/utils/alertaTokens";
import { formatFechaCorta } from "@/utils/fechas";

interface Props {
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
  initialMediciones?: Record<string, MedicionesAmbientales | null>;
}

const TIPO_ICONS: Record<TipoAlerta, React.ReactNode> = {
  RESPIRATORIA: <Wind size={20} />,
  AJUSTE: <Wrench size={20} />,
  FILTRO: <Activity size={20} />,
  FILTRO_VIDA_UTIL: <Hourglass size={20} />,
  BATERIA: <Battery size={20} />,
  DESCONEXION: <Wifi size={20} />,
};


const NIVEL_LABELS: Record<NivelAlerta, string> = {
  CRITICO: "CRITICO",
  ALERTA: "ALERTA",
  OK: "OK",
};

const NIVEL_ORDER: Record<NivelAlerta, number> = {
  CRITICO: 0,
  ALERTA: 1,
  OK: 2,
};

export default function ResumenClient({ initialJornadas, initialAlertas, initialMediciones }: Props) {
  const t = useT();
  const TIPO_LABELS: Record<TipoAlerta, string> = {
    RESPIRATORIA: t("resumen.tipoRespiratoria"),
    AJUSTE: t("resumen.tipoAjuste"),
    FILTRO: t("resumen.tipoFiltro"),
    FILTRO_VIDA_UTIL: t("resumen.tipoFiltroVidaUtil"),
    BATERIA: t("resumen.tipoBateria"),
    DESCONEXION: t("resumen.tipoDesconexion"),
  };
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>(initialJornadas);
  const [alertas, setAlertas] = useState<AlertaHistorial[]>(initialAlertas);
  const [medicionesMap, setMedicionesMap] = useState<Record<string, MedicionesAmbientales | null>>(
    initialMediciones || {}
  );
  const [loading] = useState(false);
  const [pollFailures, setPollFailures] = useState(0);

  const poll = useCallback(async () => {
    try {
      const [newJornadas, newAlertas] = await Promise.all([
        api.jornadas.activas(),
        api.alertas.activas(),
      ]);
      setJornadas(newJornadas);
      setAlertas(newAlertas);

      const medMap: Record<string, MedicionesAmbientales | null> = {};
      await Promise.all(
        newJornadas.map(async (j) => {
          medMap[String(j.id)] = await api.mediciones.latestByJornada(j.id);
        })
      );
      setMedicionesMap(medMap);

      setPollFailures(0);
    } catch {
      setPollFailures((prev) => prev + 1);
    }
  }, []);

  // Polling cada 30 segundos (fallback permanente del canal en vivo)
  useEffect(() => {
    const interval = setInterval(poll, 30_000);

    return () => clearInterval(interval);
  }, [poll]);

  // En vivo: jornadas y alertas refetchean; las mediciones llegan en el
  // propio evento y se mergean sin pedir nada (adiós al N+1 en caliente).
  const realtimeStatus = useRealtimeStatus();
  useRealtime("jornadas", poll);
  useRealtime("alertas", poll);
  useRealtime<MedicionesEventMsg>("mediciones", (e) => {
    if (e?.jornadaId != null && e.ultima) {
      setMedicionesMap((prev) => ({ ...prev, [String(e.jornadaId)]: e.ultima ?? null }));
    }
  });

  // Las tarjetas cuentan TRABAJADORES afectados, no eventos: con el job de vida
  // útil un mismo trabajador puede acumular decenas de alertas idénticas y el
  // número por eventos deja de significar riesgo (el "7336" de la auditoría).
  const workersByTipo = (tipo: TipoAlerta) =>
    new Set(
      alertas
        .filter((a) => a.tipo === tipo)
        .map((a) => a.rutTrabajador ?? a.trabajador?.rut ?? `#${a.id}`)
    ).size;

  const alertCards: { tipo: TipoAlerta; count: number }[] = [
    { tipo: "RESPIRATORIA", count: workersByTipo("RESPIRATORIA") },
    { tipo: "AJUSTE", count: workersByTipo("AJUSTE") },
    { tipo: "FILTRO", count: workersByTipo("FILTRO") },
    { tipo: "FILTRO_VIDA_UTIL", count: workersByTipo("FILTRO_VIDA_UTIL") },
    { tipo: "BATERIA", count: workersByTipo("BATERIA") },
    { tipo: "DESCONEXION", count: workersByTipo("DESCONEXION") },
  ];

  // Con fecha (dd-mm hh:mm): una alerta activa puede llevar días abierta; solo
  // la hora la disfraza de reciente.
  const formatTime = formatFechaCorta;

  // Feed: severidad primero y, dentro de cada severidad, la más reciente; una
  // fila por trabajador (sin esto, 5 CRITICO empatadas del mismo origen ocultan
  // al resto de la cuadrilla).
  const alertasFeed = (() => {
    const orden = [...alertas].sort((a, b) => {
      const sev = (NIVEL_ORDER[a.nivel] ?? 99) - (NIVEL_ORDER[b.nivel] ?? 99);
      if (sev !== 0) return sev;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    const vistos = new Set<string>();
    const filas: typeof alertas = [];
    for (const a of orden) {
      const clave = a.rutTrabajador ?? a.trabajador?.rut ?? `#${a.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      filas.push(a);
      if (filas.length === 5) break;
    }
    return filas;
  })();

  return (
    <div>
      {/* Header with title and refresh badge */}
      <div className="resumen-header" style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="resumen-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("resumen.title")}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t("resumen.subtitle")}
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: realtimeStatus === "live" ? "#22c55e" : "var(--color-text-secondary)",
            background: realtimeStatus === "live" ? "rgba(34,197,94,0.12)" : "rgba(139,148,158,0.1)",
            border: realtimeStatus === "live" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(139,148,158,0.2)",
            borderRadius: "9999px",
            padding: "0.25rem 0.75rem",
            letterSpacing: "0.025em",
          }}
        >
          {realtimeStatus === "live" ? <Radio size={12} /> : <Clock size={12} />}
          {realtimeStatus === "live" ? t("resumen.liveNow") : t("resumen.updatesEvery30s")}
          <button onClick={poll} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-secondary)", padding: "0.25rem",
            display: "flex", alignItems: "center",
          }} title={t("resumen.refreshNow")}>
            <RefreshCw size={14} />
          </button>
        </span>
      </div>

      {/* Polling failure warning */}
      {pollFailures >= 3 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            marginBottom: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "#f59e0b",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
              flexShrink: 0,
            }}
          />
          {t("resumen.pollFailureWarning")}
        </div>
      )}

      {/* Resumen Jornada Actual (bloque compartido con Estado de Cuadrilla) */}
      <ResumenJornadaActual jornadas={jornadas} medicionesMap={medicionesMap} alertas={alertas} />

      {/* Alertas activas - header */}
      <h2
        style={{
          marginBottom: "1rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <AlertTriangle size={14} />
        {t("resumen.activeAlerts")}
      </h2>

      {/* Alert cards - full width */}
      <div className="resumen-alert-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1rem" }}>
        {alertCards.map(({ tipo, count }) => {
          const color = TIPO_COLORS[tipo];
          const isActive = count > 0;

          return (
            <Link
              key={tipo}
              href={`/historial-alertas?tipo=${tipo}`}
              className="card resumen-alert-card resumen-clickable-card"
              style={{
                display: "block",
                borderTop: `3px solid ${isActive ? color : "var(--color-border)"}`,
                borderRadius: "0.75rem",
                textAlign: "center",
                padding: "1.75rem 1.25rem",
                transition: "transform 0.15s, box-shadow 0.15s",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "0.75rem",
                  color: isActive ? color : "var(--color-text-secondary)",
                }}
              >
                {TIPO_ICONS[tipo]}
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: isActive ? color : "var(--color-text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                {TIPO_LABELS[tipo]}
              </p>
              <p
                className="resumen-alert-count"
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: isActive ? color : "var(--color-text-primary)",
                  lineHeight: 1,
                }}
              >
                {loading ? "--" : count}
              </p>
              <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.375rem" }}>
                {t("resumen.workersAffectedUnit")}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Últimas alertas */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.9rem" }}>{t("resumen.latestAlerts")}</h3>

        {alertas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
            <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
              {t("resumen.noActiveAlerts")}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {t("resumen.noActiveWorkers")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {alertasFeed.map((a, idx) => {
              const dotColor = TIPO_COLORS[a.tipo];
              const nivelColor = NIVEL_COLORS[a.nivel] ?? "var(--color-text-secondary)";
              const isLast = idx === alertasFeed.length - 1;

              return (
                <Link
                  key={a.id}
                  href={`/historial-alertas/${a.id}`}
                  className="resumen-alert-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0.5rem",
                    borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {/* Colored dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  {/* Badge de severidad */}
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: nivelColor,
                      backgroundColor: `${nivelColor}22`,
                      border: `1px solid ${nivelColor}44`,
                      borderRadius: "9999px",
                      padding: "0.1rem 0.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {NIVEL_LABELS[a.nivel] ?? a.nivel}
                  </span>
                  <span style={{ fontSize: "0.85rem", flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>{TIPO_LABELS[a.tipo]}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}> — </span>
                    {a.trabajador?.nombre} {a.trabajador?.apellidoPaterno}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace", flexShrink: 0 }}>
                    {formatTime(a.timestamp)}
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        )}

        {/* Ver todo el historial link */}
        <div style={{ textAlign: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
          <Link
            href="/historial-alertas"
            style={{
              color: "var(--color-accent)",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {t("resumen.viewFullHistory")}
          </Link>
        </div>
      </div>

      {/* Accesos rapidos */}
      <h2 style={{
        marginBottom: "1rem",
        marginTop: "1.5rem",
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
        Accesos rápidos
      </h2>

      <div className="resumen-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { href: "/cuadrilla", label: "Cuadrillas", desc: "Gestionar cuadrillas y trabajadores", icon: <Activity size={20} />, color: "#3b82f6" },
          { href: "/vida-util-filtros", label: "Vida útil de filtros", desc: "Estado y reemplazo de filtros", icon: <Wrench size={20} />, color: "#f59e0b" },
          { href: "/historial-alertas", label: "Historial de alertas", desc: "Revisar todas las alertas", icon: <AlertTriangle size={20} />, color: "#ef4444" },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="card resumen-quick-card resumen-clickable-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "0.625rem",
                backgroundColor: `${q.color}22`,
                color: q.color,
                flexShrink: 0,
              }}
            >
              {q.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                {q.label}
              </span>
              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
                {q.desc}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>

      <style>{`
        .resumen-clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        }
        .resumen-alert-row {
          border-radius: 0.375rem;
          transition: background-color 0.15s;
        }
        .resumen-alert-row:hover {
          background-color: rgba(139,148,158,0.08);
        }
        @media (max-width: 1024px) {
          .resumen-quick-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .resumen-alert-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.75rem !important;
          }
          .resumen-alert-card {
            padding: 1.25rem 0.75rem !important;
          }
        }
        @media (max-width: 768px) {
          .resumen-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
            margin-bottom: 1.25rem !important;
          }
          .resumen-title {
            font-size: 1.25rem !important;
          }
          .resumen-alert-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .resumen-alert-card {
            padding: 1rem 0.5rem !important;
          }
          .resumen-alert-count {
            font-size: 1.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
