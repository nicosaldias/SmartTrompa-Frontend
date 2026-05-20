"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/api/client";
import type { JornadaTrabajo, AlertaHistorial, Trabajador, TipoAlerta, NivelAlerta, MedicionesAmbientales, Ajustes } from "@/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BINARY_ALERT_TYPES } from "@/types";
import { interpretNivelAjuste, interpretNivelAtollo, nivelAjusteColor, nivelAtolloColor, formatRelativeTime } from "@/utils/sensorMappings";
import { Wind, Wrench, Activity, Battery, Wifi, LayoutGrid, Table, RefreshCw } from "lucide-react";

interface Props {
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
  trabajadores: Trabajador[];
  initialMediciones?: Record<string, MedicionesAmbientales | null>;
  initialAjustes?: Record<string, Ajustes | null>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
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

export default function CuadrillaClient({ initialJornadas, initialAlertas, trabajadores, initialMediciones, initialAjustes }: Props) {
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>(initialJornadas);
  const [alertas, setAlertas] = useState<AlertaHistorial[]>(initialAlertas);
  const [medicionesMap, setMedicionesMap] = useState<Record<string, MedicionesAmbientales | null>>(
    initialMediciones || {}
  );
  const [ajustesMap, setAjustesMap] = useState<Record<string, Ajustes | null>>(
    initialAjustes || {}
  );
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
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
      const ajMap: Record<string, Ajustes | null> = {};
      await Promise.all(
        newJornadas.map(async (j) => {
          const [med, aj] = await Promise.all([
            api.mediciones.latestByJornada(j.id),
            api.mediciones.ajustesByJornada(j.id).catch(() => null),
          ]);
          medMap[String(j.id)] = med;
          ajMap[String(j.id)] = aj;
        })
      );
      setMedicionesMap(medMap);
      setAjustesMap(ajMap);

      setPollFailures(0);
    } catch {
      setPollFailures((prev) => prev + 1);
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

  const sinProblemas = totalActivos - alertasCriticas - advertencias;

  const operativity = totalActivos > 0
    ? Math.round(((totalActivos - alertasCriticas) / totalActivos) * 100)
    : 0;

  // Conteo por tipo de alerta
  const alertasPorTipo = ALERTA_TIPOS.reduce((acc, tipo) => {
    acc[tipo] = jornadas.filter((j) => {
      const nivel = getAlertNivel(alertas, j.rutUsuario, tipo);
      return nivel !== "OK";
    }).length;
    return acc;
  }, {} as Record<TipoAlerta, number>);

  // Agrupar jornadas por supervisor
  const jornadasPorSupervisor = jornadas.reduce((groups, j) => {
    const supRut = j.idSupervisor || "sin-supervisor";
    if (!groups[supRut]) groups[supRut] = [];
    groups[supRut].push(j);
    return groups;
  }, {} as Record<string, JornadaTrabajo[]>);

  const supervisorRuts = Object.keys(jornadasPorSupervisor);

  // ── Render helpers ──

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  function alertAnimClass(nivel: NivelAlerta): string {
    if (nivel === "OK") return "pulse-ok";
    if (nivel === "ALERTA") return "pulse-warn";
    return "pulse-crit";
  }

  function alertColor(nivel: NivelAlerta): string {
    if (nivel === "OK") return "#22c55e";
    if (nivel === "ALERTA") return "#f59e0b";
    return "#ef4444";
  }

  function renderPieChart(ajustes: Ajustes | null | undefined, size: number = 48) {
    if (!ajustes || (ajustes.ajustado === 0 && ajustes.desajustado === 0)) {
      return (
        <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={size} height={size} viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="3" />
            <text x="18" y="20" textAnchor="middle" fontSize="7" fill="var(--color-text-secondary)">--</text>
          </svg>
        </div>
      );
    }
    const total = ajustes.ajustado + ajustes.desajustado;
    const pctAjustado = Math.round((ajustes.ajustado / total) * 100);
    const pctDesajustado = 100 - pctAjustado;
    // SVG donut chart using stroke-dasharray
    const circumference = 2 * Math.PI * 15.9;
    const ajustadoLen = (pctAjustado / 100) * circumference;
    const desajustadoLen = circumference - ajustadoLen;

    return (
      <div style={{ width: size, height: size, position: "relative" }} title={`Ajustado: ${pctAjustado}% | Desajustado: ${pctDesajustado}%`}>
        <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
          {/* Desajustado (rojo) - fondo */}
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.5"
            strokeDasharray={`${circumference} ${circumference}`} />
          {/* Ajustado (verde) - encima */}
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3.5"
            strokeDasharray={`${ajustadoLen} ${desajustadoLen}`} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size < 40 ? "0.5rem" : "0.6rem", fontWeight: 700,
          color: pctAjustado >= 70 ? "#22c55e" : pctAjustado >= 40 ? "#f59e0b" : "#ef4444",
        }}>
          {pctAjustado}%
        </div>
      </div>
    );
  }

  function renderWorkerCard(jornada: JornadaTrabajo) {
    const t = findTrabajador(jornada.rutUsuario);
    const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "CRITICO");
    const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "ALERTA");
    const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
    const medicion = medicionesMap[String(jornada.id)];

    return (
      <div
        key={jornada.id}
        className="card"
        style={{ padding: "0.75rem", borderLeft: `3px solid ${alertColor(estadoGeneral)}` }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            {t?.tieneImagen ? (
              <img src={`${API_URL}/trabajador/${t.rut}/imagen/`} alt=""
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: "0.75rem",
              }}>
                {t ? `${t.nombre.charAt(0)}${t.apellidoPaterno.charAt(0)}` : "?"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t ? `${t.nombre} ${t.apellidoPaterno}` : jornada.rutUsuario}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}>
                {t?.rut || jornada.rutUsuario}
              </p>
            </div>
          </div>
          <span className={alertAnimClass(estadoGeneral)} style={{
            fontSize: "0.6rem", fontWeight: 700, color: alertColor(estadoGeneral),
            letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
          }}>
            {estadoGeneral === "OK" ? "NORMAL" : estadoGeneral}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
          {ALERTA_TIPOS.map((tipo) => {
            const nivel = getAlertNivel(alertas, jornada.rutUsuario, tipo);
            return (
              <div key={tipo} className={alertAnimClass(nivel)} style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                padding: "0.25rem 0.375rem", borderRadius: "0.25rem",
                color: alertColor(nivel), fontSize: "0.65rem", fontWeight: 600,
              }} title={`${TIPO_LABELS[tipo]}: ${nivel}`}>
                {TIPO_ICONS[tipo]}
                <span>{TIPO_LABELS[tipo]}</span>
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: "0.5rem",
          paddingTop: "0.5rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}>
          <div style={{ flexShrink: 0 }}>
            {renderPieChart(ajustesMap[String(jornada.id)], 48)}
            <p style={{ fontSize: "0.5rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "0.125rem" }}>Ajuste</p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.25rem 0.75rem",
            fontSize: "0.65rem",
            color: "var(--color-text-secondary)",
            flex: 1,
          }}>
            <span>Frec. Resp: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.frecuenciaRespiratoria ?? '--'} bpm</b></span>
            <span>Ajuste: <b style={{ color: nivelAjusteColor(medicion?.nivelAjuste) }}>{interpretNivelAjuste(medicion?.nivelAjuste)}</b></span>
            <span>Atollo: <b style={{ color: nivelAtolloColor(medicion?.nivelAtollo) }}>{interpretNivelAtollo(medicion?.nivelAtollo)}</b></span>
            <span>Bateria: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.bateria != null ? `${medicion.bateria}%` : '--'}</b></span>
          </div>
        </div>
        {medicion?.timestamp && (
          <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", textAlign: "right" }}>
            {formatRelativeTime(medicion.timestamp)}
          </p>
        )}
      </div>
    );
  }

  // Check if a supervisor has their own active jornada
  function supervisorHasJornada(supRut: string): boolean {
    return jornadas.some((j) => j.rutUsuario === supRut);
  }

  function renderSupervisorCard(supRut: string) {
    const sup = findTrabajador(supRut);
    const hasJornada = supervisorHasJornada(supRut);

    if (hasJornada) {
      // Supervisor is active in the field - show their alert status
      const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "CRITICO");
      const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "ALERTA");
      const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
      const supJornada = jornadas.find(j => j.rutUsuario === supRut);
      const medicion = supJornada ? medicionesMap[String(supJornada.id)] : null;

      return (
        <div
          className="card"
          style={{ padding: "0.75rem", borderLeft: `3px solid ${alertColor(estadoGeneral)}`, backgroundColor: "rgba(59,130,246,0.04)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              {sup?.tieneImagen ? (
                <img src={`${API_URL}/trabajador/${sup.rut}/imagen/`} alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #3b82f6" }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: "0.75rem",
                }}>
                  {sup ? `${sup.nombre.charAt(0)}${sup.apellidoPaterno.charAt(0)}` : "?"}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut}
                </p>
                <p style={{ color: "#3b82f6", fontSize: "0.65rem", fontWeight: 600 }}>
                  SUPERVISOR
                </p>
              </div>
            </div>
            <span className={alertAnimClass(estadoGeneral)} style={{
              fontSize: "0.6rem", fontWeight: 700, color: alertColor(estadoGeneral),
              letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            }}>
              {estadoGeneral === "OK" ? "NORMAL" : estadoGeneral}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
            {ALERTA_TIPOS.map((tipo) => {
              const nivel = getAlertNivel(alertas, supRut, tipo);
              return (
                <div key={tipo} className={alertAnimClass(nivel)} style={{
                  display: "flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.25rem 0.375rem", borderRadius: "0.25rem",
                  color: alertColor(nivel), fontSize: "0.65rem", fontWeight: 600,
                }} title={`${TIPO_LABELS[tipo]}: ${nivel}`}>
                  {TIPO_ICONS[tipo]}
                  <span>{TIPO_LABELS[tipo]}</span>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: "0.5rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
          }}>
            <div style={{ flexShrink: 0 }}>
              {renderPieChart(supJornada ? ajustesMap[String(supJornada.id)] : null, 48)}
              <p style={{ fontSize: "0.5rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "0.125rem" }}>Ajuste</p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.25rem 0.75rem",
              fontSize: "0.65rem",
              color: "var(--color-text-secondary)",
              flex: 1,
            }}>
              <span>Frec. Resp: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.frecuenciaRespiratoria ?? '--'} bpm</b></span>
              <span>Ajuste: <b style={{ color: nivelAjusteColor(medicion?.nivelAjuste) }}>{interpretNivelAjuste(medicion?.nivelAjuste)}</b></span>
              <span>Atollo: <b style={{ color: nivelAtolloColor(medicion?.nivelAtollo) }}>{interpretNivelAtollo(medicion?.nivelAtollo)}</b></span>
              <span>Bateria: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.bateria != null ? `${medicion.bateria}%` : '--'}</b></span>
            </div>
          </div>
          {medicion?.timestamp && (
            <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", textAlign: "right" }}>
              {formatRelativeTime(medicion.timestamp)}
            </p>
          )}
        </div>
      );
    }

    // Supervisor is NOT active - show as INACTIVO
    return (
      <div
        className="card"
        style={{ padding: "0.75rem", borderLeft: "3px solid var(--color-border)", opacity: 0.6 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            {sup?.tieneImagen ? (
              <img src={`${API_URL}/trabajador/${sup.rut}/imagen/`} alt=""
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)", filter: "grayscale(50%)" }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "var(--color-bg-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--color-text-secondary)", fontWeight: 700, fontSize: "0.75rem",
                border: "1px solid var(--color-border)",
              }}>
                {sup ? `${sup.nombre.charAt(0)}${sup.apellidoPaterno.charAt(0)}` : "?"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--color-text-secondary)" }}>
                {sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem", fontWeight: 600 }}>
                SUPERVISOR
              </p>
            </div>
          </div>
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, color: "var(--color-text-secondary)",
            letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            padding: "0.2rem 0.5rem", borderRadius: "9999px",
            backgroundColor: "rgba(139,148,158,0.1)", border: "1px solid rgba(139,148,158,0.2)",
          }}>
            INACTIVO
          </span>
        </div>
      </div>
    );
  }

  function renderSupervisorHeader(supRut: string, count: number) {
    const sup = findTrabajador(supRut);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", marginTop: "0.5rem" }}>
        {sup?.tieneImagen ? (
          <img src={`${API_URL}/trabajador/${sup.rut}/imagen/`} alt=""
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-accent)" }} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "0.8rem",
          }}>
            {sup ? `${sup.nombre.charAt(0)}${sup.apellidoPaterno.charAt(0)}` : "?"}
          </div>
        )}
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut}
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
            Supervisor · {count} trabajador{count !== 1 ? "es" : ""} activo{count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }

  function renderCards() {
    if (jornadas.length === 0) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
            No hay trabajadores activos
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            Los trabajadores activos apareceran aqui cuando inicien una tanda de trabajo
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {supervisorRuts.map((supRut) => {
          const supJornadas = jornadasPorSupervisor[supRut];
          // Filter out supervisor's own jornada from worker list (shown separately)
          const workerJornadas = supJornadas.filter((j) => j.rutUsuario !== supRut);
          return (
            <div key={supRut}>
              {renderSupervisorHeader(supRut, workerJornadas.length)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                {renderSupervisorCard(supRut)}
                {workerJornadas.map((j) => renderWorkerCard(j))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSupervisorTableRow(supRut: string) {
    const sup = findTrabajador(supRut);
    const hasJornada = supervisorHasJornada(supRut);

    if (!hasJornada) {
      return (
        <tr key={`sup-${supRut}`} style={{ borderBottom: "1px solid var(--color-border)", opacity: 0.6 }}>
          <td style={{ padding: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "var(--color-bg-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--color-text-secondary)", fontWeight: 700, fontSize: "0.65rem",
                border: "1px solid var(--color-border)",
              }}>
                {sup ? `${sup.nombre.charAt(0)}${sup.apellidoPaterno.charAt(0)}` : "?"}
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  {sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 600, marginLeft: "0.5rem" }}>SUP</span>
              </div>
            </div>
          </td>
          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
            {sup?.rut || supRut}
          </td>
          {ALERTA_TIPOS.map((tipo) => (
            <td key={tipo} style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>—</td>
          ))}
          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>—</td>
          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>—</td>
          <td style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>
              INACTIVO
            </span>
          </td>
        </tr>
      );
    }

    const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "CRITICO");
    const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "ALERTA");
    const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
    const supJornada = jornadas.find(j => j.rutUsuario === supRut);
    const medicion = supJornada ? medicionesMap[String(supJornada.id)] : null;

    return (
      <tr key={`sup-${supRut}`} style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "rgba(59,130,246,0.03)" }}>
        <td style={{ padding: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {sup?.tieneImagen ? (
              <img src={`${API_URL}/trabajador/${sup.rut}/imagen/`} alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #3b82f6" }} />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: "0.65rem",
              }}>
                {sup ? `${sup.nombre.charAt(0)}${sup.apellidoPaterno.charAt(0)}` : "?"}
              </div>
            )}
            <div>
              <span style={{ fontWeight: 600 }}>
                {sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut}
              </span>
              <span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 600, marginLeft: "0.5rem" }}>SUP</span>
            </div>
          </div>
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
          {sup?.rut || supRut}
        </td>
        {ALERTA_TIPOS.map((tipo) => {
          const nivel = getAlertNivel(alertas, supRut, tipo);
          return (
            <td key={tipo} style={{ padding: "0.75rem", textAlign: "center" }}>
              <div className={alertAnimClass(nivel)} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: "0.25rem", color: alertColor(nivel), fontSize: "0.7rem", fontWeight: 700,
              }}>
                {TIPO_ICONS[tipo]}
                <span>{nivel}</span>
              </div>
            </td>
          );
        })}
        <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
          {medicion?.frecuenciaRespiratoria ?? '--'} <span style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>bpm</span>
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
          {medicion?.bateria != null ? `${medicion.bateria}%` : '--'}
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center" }}>
          <span className={alertAnimClass(estadoGeneral)} style={{
            fontSize: "0.65rem", fontWeight: 700,
            color: alertColor(estadoGeneral), letterSpacing: "0.05em",
          }}>
            {estadoGeneral === "OK" ? "NORMAL" : estadoGeneral}
          </span>
        </td>
      </tr>
    );
  }

  function renderTable() {
    if (jornadas.length === 0) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
            No hay trabajadores activos
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            Los trabajadores activos apareceran aqui cuando inicien una tanda de trabajo
          </p>
        </div>
      );
    }

    const headerIcons: Record<TipoAlerta, React.ReactNode> = {
      RESPIRATORIA: <Wind size={14} />,
      AJUSTE: <Wrench size={14} />,
      FILTRO: <Activity size={14} />,
      BATERIA: <Battery size={14} />,
      DESCONEXION: <Wifi size={14} />,
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {supervisorRuts.map((supRut) => {
          const supJornadas = jornadasPorSupervisor[supRut];
          const workerJornadas = supJornadas.filter((j) => j.rutUsuario !== supRut);
          return (
            <div key={supRut}>
              {renderSupervisorHeader(supRut, workerJornadas.length)}
              <div className="card" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        Trabajador
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        RUT
                      </th>
                      {ALERTA_TIPOS.map((tipo) => (
                        <th key={tipo} style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                            {headerIcons[tipo]}
                            {TIPO_LABELS[tipo]}
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        Frec. Resp
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        Bateria
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderSupervisorTableRow(supRut)}
                    {workerJornadas.map((jornada) => {
                      const t = findTrabajador(jornada.rutUsuario);
                      const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "CRITICO");
                      const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "ALERTA");
                      const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
                      const medicion = medicionesMap[String(jornada.id)];
                      return (
                        <tr key={jornada.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {t?.tieneImagen ? (
                                <img src={`${API_URL}/trabajador/${t.rut}/imagen/`} alt=""
                                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                              ) : (
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "white", fontWeight: 700, fontSize: "0.65rem",
                                }}>
                                  {t ? `${t.nombre.charAt(0)}${t.apellidoPaterno.charAt(0)}` : "?"}
                                </div>
                              )}
                              <span style={{ fontWeight: 600 }}>
                                {t ? `${t.nombre} ${t.apellidoPaterno}` : jornada.rutUsuario}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                            {t?.rut || jornada.rutUsuario}
                          </td>
                          {ALERTA_TIPOS.map((tipo) => {
                            const nivel = getAlertNivel(alertas, jornada.rutUsuario, tipo);
                            return (
                              <td key={tipo} style={{ padding: "0.75rem", textAlign: "center" }}>
                                <div className={alertAnimClass(nivel)} style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  gap: "0.25rem", color: alertColor(nivel), fontSize: "0.7rem", fontWeight: 700,
                                }}>
                                  {TIPO_ICONS[tipo]}
                                  <span>{nivel}</span>
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
                            {medicion?.frecuenciaRespiratoria ?? '--'} <span style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>bpm</span>
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
                            {medicion?.bateria != null ? `${medicion.bateria}%` : '--'}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <span className={alertAnimClass(estadoGeneral)} style={{
                              fontSize: "0.65rem", fontWeight: 700,
                              color: alertColor(estadoGeneral), letterSpacing: "0.05em",
                            }}>
                              {estadoGeneral === "OK" ? "NORMAL" : estadoGeneral}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes pulseOk {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes pulseWarn {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulseCrit {
          0%, 100% { opacity: 1; text-shadow: 0 0 8px currentColor; }
          50% { opacity: 0.3; text-shadow: none; }
        }
        .pulse-ok { animation: pulseOk 3s ease-in-out infinite; }
        .pulse-warn { animation: pulseWarn 1.5s ease-in-out infinite; }
        .pulse-crit { animation: pulseCrit 0.8s ease-in-out infinite; }
      `}</style>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            Estado de Cuadrilla
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Vista en tiempo real de supervisores y trabajadores activos
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <button onClick={poll} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-secondary)", padding: "0.25rem",
            display: "flex", alignItems: "center",
            marginRight: "0.5rem",
          }} title="Actualizar ahora">
            <RefreshCw size={16} />
          </button>
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

      {/* Content */}
      <div style={{ transition: "opacity 0.2s ease" }} key={viewMode}>
        {viewMode === "cards" ? renderCards() : renderTable()}
      </div>

      {/* Summary Card */}
      {totalActivos > 0 && (
        <div className="card" style={{ marginTop: "1.5rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            RESUMEN DE TURNO
          </h2>

          {/* Main stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ textAlign: "center", padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(249,115,22,0.08)" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f97316" }}>{totalActivos}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>ACTIVOS</p>
            </div>
            <div style={{ textAlign: "center", padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(34,197,94,0.08)" }}>
              <p className="pulse-ok" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#22c55e" }}>{sinProblemas}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>SIN PROBLEMAS</p>
            </div>
            <div style={{ textAlign: "center", padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: advertencias > 0 ? "rgba(245,158,11,0.08)" : "transparent" }}>
              <p className={advertencias > 0 ? "pulse-warn" : ""} style={{ fontSize: "1.75rem", fontWeight: 800, color: advertencias > 0 ? "#f59e0b" : "var(--color-text-secondary)" }}>{advertencias}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>ADVERTENCIAS</p>
            </div>
            <div style={{ textAlign: "center", padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: alertasCriticas > 0 ? "rgba(239,68,68,0.08)" : "transparent" }}>
              <p className={alertasCriticas > 0 ? "pulse-crit" : ""} style={{ fontSize: "1.75rem", fontWeight: 800, color: alertasCriticas > 0 ? "#ef4444" : "var(--color-text-secondary)" }}>{alertasCriticas}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>CRITICAS</p>
            </div>
            <div style={{ textAlign: "center", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, color: operativity >= 80 ? "#22c55e" : operativity >= 50 ? "#f59e0b" : "#ef4444" }}>{operativity}%</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>OPERATIVIDAD</p>
            </div>
          </div>

          {/* Alertas por tipo */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {ALERTA_TIPOS.map((tipo) => {
              const count = alertasPorTipo[tipo];
              const hasIssue = count > 0;
              return (
                <div
                  key={tipo}
                  className={hasIssue ? "pulse-warn" : ""}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.3rem 0.625rem",
                    borderRadius: "9999px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: hasIssue ? "#f59e0b" : "var(--color-text-secondary)",
                    backgroundColor: hasIssue ? "rgba(245,158,11,0.1)" : "rgba(139,148,158,0.08)",
                    border: `1px solid ${hasIssue ? "rgba(245,158,11,0.25)" : "transparent"}`,
                  }}
                >
                  {TIPO_ICONS[tipo]}
                  {TIPO_LABELS[tipo]}: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
