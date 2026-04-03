"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/api/client";
import type { JornadaTrabajo, AlertaHistorial, Trabajador, TipoAlerta, NivelAlerta } from "@/types";
import { Wind, Wrench, Activity, Battery, Wifi, LayoutGrid, Table } from "lucide-react";

interface Props {
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
  trabajadores: Trabajador[];
}

const ALERTA_TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];

const TIPO_LABELS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "Respiratoria",
  AJUSTE: "Ajuste",
  FILTRO: "Filtro",
  BATERIA: "Batería",
  DESCONEXION: "Desconexión",
};

const TIPO_ICONS: Record<TipoAlerta, React.ReactNode> = {
  RESPIRATORIA: <Wind size={13} />,
  AJUSTE: <Wrench size={13} />,
  FILTRO: <Activity size={13} />,
  BATERIA: <Battery size={13} />,
  DESCONEXION: <Wifi size={13} />,
};

function nivelColor(nivel: NivelAlerta): string {
  if (nivel === "OK") return "var(--color-green)";
  if (nivel === "ALERTA") return "var(--color-yellow)";
  return "var(--color-red)";
}

function getAlertNivel(alertas: AlertaHistorial[], rut: string, tipo: TipoAlerta): NivelAlerta {
  const match = alertas.find((a) => a.rutTrabajador === rut && a.tipo === tipo);
  return match ? match.nivel : "OK";
}

export default function CuadrillaClient({ initialJornadas, initialAlertas, trabajadores }: Props) {
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>(initialJornadas);
  const [alertas, setAlertas] = useState<AlertaHistorial[]>(initialAlertas);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const poll = useCallback(async () => {
    try {
      const [newJornadas, newAlertas] = await Promise.all([
        api.jornadas.activas(),
        api.alertas.activas(),
      ]);
      setJornadas(newJornadas);
      setAlertas(newAlertas);
    } catch {
      // silently fail polling — keep stale data
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [poll]);

  // Derived data
  const findTrabajador = (rut: string): Trabajador | undefined =>
    trabajadores.find((t) => t.rut === rut);

  const totalActivos = jornadas.length;

  const alertasCriticas = jornadas.filter((j) =>
    ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, j.rutUsuario, tipo) === "CRITICO")
  ).length;

  const advertencias = jornadas.filter((j) =>
    ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, j.rutUsuario, tipo) === "ALERTA") &&
    !ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, j.rutUsuario, tipo) === "CRITICO")
  ).length;

  const operativity = totalActivos > 0
    ? Math.round(((totalActivos - alertasCriticas) / totalActivos) * 100)
    : 0;

  // ── Render helpers ──

  function renderDot(nivel: NivelAlerta) {
    const color = nivelColor(nivel);
    return (
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: nivel !== "OK" ? `0 0 6px ${color}` : "none",
          flexShrink: 0,
        }}
      />
    );
  }

  function renderCards() {
    if (jornadas.length === 0) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
            No hay jornadas activas en este momento
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {jornadas.map((jornada) => {
          const t = findTrabajador(jornada.rutUsuario);
          const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "CRITICO");
          const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "ALERTA");
          const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";

          return (
            <div
              key={jornada.id}
              className="card"
              style={{
                borderTop: `3px solid ${nivelColor(estadoGeneral)}`,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                    {t ? `${t.nombre} ${t.apellidoPaterno}` : jornada.rutUsuario}
                  </p>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem", marginTop: "0.125rem" }}>
                    {t?.rut || jornada.rutUsuario} · {t?.cargo || "Sin cargo"}
                  </p>
                </div>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: nivelColor(estadoGeneral),
                    boxShadow: `0 0 8px ${nivelColor(estadoGeneral)}`,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
              </div>

              {/* Alert indicators */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {ALERTA_TIPOS.map((tipo) => {
                  const nivel = getAlertNivel(alertas, jornada.rutUsuario, tipo);
                  return (
                    <div
                      key={tipo}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "0.375rem",
                        backgroundColor: nivel !== "OK" ? `${nivelColor(nivel)}12` : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                        {TIPO_ICONS[tipo]}
                        <span>{TIPO_LABELS[tipo]}</span>
                      </div>
                      {renderDot(nivel)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTable() {
    if (jornadas.length === 0) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
            No hay jornadas activas en este momento
          </p>
        </div>
      );
    }

    return (
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Trabajador", "RUT", "Cargo", "Resp.", "Ajuste", "Filtro", "Batería", "Desconexión"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem",
                    textAlign: "left",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jornadas.map((jornada) => {
              const t = findTrabajador(jornada.rutUsuario);
              return (
                <tr key={jornada.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {t ? `${t.nombre} ${t.apellidoPaterno}` : jornada.rutUsuario}
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--color-text-secondary)" }}>
                    {t?.rut || jornada.rutUsuario}
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--color-text-secondary)" }}>
                    {t?.cargo || "—"}
                  </td>
                  {ALERTA_TIPOS.map((tipo) => (
                    <td key={tipo} style={{ padding: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {renderDot(getAlertNivel(alertas, jornada.rutUsuario, tipo))}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            Estado de Cuadrilla
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Vista en tiempo real de todos los trabajadores en jornada activa
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            onClick={() => setViewMode("cards")}
            className={viewMode === "cards" ? "btn-primary" : "btn-secondary"}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          >
            <LayoutGrid size={15} />
            Tarjetas
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "btn-primary" : "btn-secondary"}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          >
            <Table size={15} />
            Tabla
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "cards" ? renderCards() : renderTable()}

      {/* Summary Card */}
      {totalActivos > 0 && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            RESUMEN DE TURNO
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
            {/* Operatividad */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: operativity >= 80 ? "var(--color-green)" : operativity >= 50 ? "var(--color-yellow)" : "var(--color-red)" }}>
                {operativity}%
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Operatividad</p>
            </div>
            {/* Total activos */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-accent)" }}>
                {totalActivos}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Total activos</p>
            </div>
            {/* Alertas críticas */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: alertasCriticas > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                {alertasCriticas}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Alertas críticas</p>
            </div>
            {/* Advertencias */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: advertencias > 0 ? "var(--color-yellow)" : "var(--color-green)" }}>
                {advertencias}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Advertencias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
