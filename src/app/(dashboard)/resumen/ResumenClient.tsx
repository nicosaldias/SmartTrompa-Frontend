"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/api/client";
import type { JornadaTrabajo, AlertaHistorial, TipoAlerta } from "@/types";
import { Activity, AlertTriangle, Battery, Wifi, Wind, Wrench, Clock, RefreshCw } from "lucide-react";

interface Props {
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
}

const TIPO_ICONS: Record<TipoAlerta, React.ReactNode> = {
  RESPIRATORIA: <Wind size={20} />,
  AJUSTE: <Wrench size={20} />,
  FILTRO: <Activity size={20} />,
  BATERIA: <Battery size={20} />,
  DESCONEXION: <Wifi size={20} />,
};

const TIPO_LABELS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "Respiratorias",
  AJUSTE: "Ajuste",
  FILTRO: "Filtro",
  BATERIA: "Batería",
  DESCONEXION: "Desconexión",
};

const TIPO_COLORS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "#ef4444",
  AJUSTE: "#f97316",
  FILTRO: "#eab308",
  BATERIA: "#8b949e",
  DESCONEXION: "#8b5cf6",
};

export default function ResumenClient({ initialJornadas, initialAlertas }: Props) {
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>(initialJornadas);
  const [alertas, setAlertas] = useState<AlertaHistorial[]>(initialAlertas);
  const [loading] = useState(false);
  const [pollFailures, setPollFailures] = useState(0);

  async function poll() {
    try {
      const [newJornadas, newAlertas] = await Promise.all([
        api.jornadas.activas(),
        api.alertas.activas(),
      ]);
      setJornadas(newJornadas);
      setAlertas(newAlertas);
      setPollFailures(0);
    } catch {
      setPollFailures((prev) => prev + 1);
    }
  }

  // Polling cada 30 segundos
  useEffect(() => {
    const interval = setInterval(poll, 30_000);

    return () => clearInterval(interval);
  }, []);

  const countByTipo = (tipo: TipoAlerta) =>
    alertas.filter((a) => a.tipo === tipo).length;

  const alertCards: { tipo: TipoAlerta; count: number }[] = [
    { tipo: "RESPIRATORIA", count: countByTipo("RESPIRATORIA") },
    { tipo: "AJUSTE", count: countByTipo("AJUSTE") },
    { tipo: "FILTRO", count: countByTipo("FILTRO") },
    { tipo: "BATERIA", count: countByTipo("BATERIA") },
    { tipo: "DESCONEXION", count: countByTipo("DESCONEXION") },
  ];

  const formatTime = (timestamp: string): string => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  };

  return (
    <div>
      {/* Header with title and refresh badge */}
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Resumen</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Indicadores clave del sistema en tiempo real
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            background: "rgba(139,148,158,0.1)",
            border: "1px solid rgba(139,148,158,0.2)",
            borderRadius: "9999px",
            padding: "0.25rem 0.75rem",
            letterSpacing: "0.025em",
          }}
        >
          <Clock size={12} />
          ACTUALIZACIÓN CADA 30S
          <button onClick={poll} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-secondary)", padding: "0.25rem",
            display: "flex", alignItems: "center",
          }} title="Actualizar ahora">
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
          Error al actualizar datos — los valores mostrados pueden estar desactualizados
        </div>
      )}

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
        Alertas activas
      </h2>

      {/* Alert cards - full width */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
        {alertCards.map(({ tipo, count }) => {
          const color = TIPO_COLORS[tipo];
          const isActive = count > 0;

          return (
            <div
              key={tipo}
              className="card"
              style={{
                borderTop: `3px solid ${isActive ? color : "var(--color-border)"}`,
                borderRadius: "0.75rem",
                textAlign: "center",
                padding: "1.75rem 1.25rem",
                transition: "transform 0.15s",
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
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: isActive ? color : "var(--color-text-primary)",
                  lineHeight: 1,
                }}
              >
                {loading ? "--" : String(count).padStart(2, "0")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Últimas alertas */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.9rem" }}>Últimas alertas</h3>

        {alertas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
            <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
              Sin alertas activas
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              No hay trabajadores activos en este momento
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {alertas.slice(0, 5).map((a, idx) => {
              const dotColor = TIPO_COLORS[a.tipo];
              const isLast = idx === Math.min(alertas.length, 5) - 1;

              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0",
                    borderBottom: isLast ? "none" : "1px solid var(--color-border)",
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
                  <span style={{ fontSize: "0.85rem", flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{TIPO_LABELS[a.tipo]}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}> — </span>
                    {a.trabajador?.nombre} {a.trabajador?.apellidoPaterno}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace", flexShrink: 0 }}>
                    {formatTime(a.timestamp)}
                  </span>
                </div>
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
            Ver todo el historial
          </Link>
        </div>
      </div>
    </div>
  );
}
