"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/api/client";
import type { JornadaTrabajo, AlertaHistorial, Trabajador, TipoAlerta, NivelAlerta, MedicionesAmbientales, Ajustes } from "@/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BINARY_ALERT_TYPES } from "@/types";
import { interpretNivelAjuste, interpretNivelAtollo, nivelAjusteColor, nivelAtolloColor, formatRelativeTime, DEFAULT_THRESHOLDS, getAlertNivel, esMedicionReciente } from "@/utils/sensorMappings";
import { fmtNum } from "@/utils/format";
import { Wind, Wrench, Activity, Battery, Wifi, LayoutGrid, Table, RefreshCw, Square } from "lucide-react";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import { API_BASE_URL as API_URL } from "@/api/endpoints";
import ResumenJornadaActual from "@/components/ResumenJornadaActual";
import { useRealtime } from "@/realtime/RealtimeProvider";
import type { MedicionesEventMsg } from "@/realtime/events";

interface Props {
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
  trabajadores: Trabajador[];
  initialMediciones?: Record<string, MedicionesAmbientales | null>;
  initialAjustes?: Record<string, Ajustes | null>;
}

const ALERTA_TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];

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

export default function CuadrillaClient({ initialJornadas, initialAlertas, trabajadores, initialMediciones, initialAjustes }: Props) {
  const t = useT();
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

  const TIPO_LABELS: Record<TipoAlerta, string> = {
    RESPIRATORIA: t("cuadrilla.tipoRespiratoria"),
    AJUSTE: t("cuadrilla.tipoAjuste"),
    FILTRO: t("cuadrilla.tipoFiltro"),
    BATERIA: t("cuadrilla.tipoBateria"),
    DESCONEXION: t("cuadrilla.tipoDesconexion"),
  };

  const nivelLabel = (nivel: NivelAlerta): string => {
    if (nivel === "OK") return t("cuadrilla.nivelOk");
    if (nivel === "ALERTA") return t("cuadrilla.nivelAlerta");
    return t("cuadrilla.nivelCritico");
  };

  const estadoLabel = (nivel: NivelAlerta): string => {
    if (nivel === "OK") return t("cuadrilla.estadoNormal");
    if (nivel === "ALERTA") return t("cuadrilla.nivelAlerta");
    return t("cuadrilla.nivelCritico");
  };

  // Estado por variable con etiquetas especificas:
  // - AJUSTE: binario OK / Desajustado (rojo)
  // - RESPIRATORIA: Normal / Anomalo (+ flecha ↑ si la frecuencia esta alta, ↓ si esta baja)
  // - FILTRO/BATERIA/DESCONEXION: OK / Alerta / Critico (sin cambio)
  const estadoVariable = (
    tipo: TipoAlerta,
    nivel: NivelAlerta,
    medicion?: MedicionesAmbientales | null
  ): string => {
    if (tipo === "AJUSTE") {
      return nivel === "OK" ? t("cuadrilla.nivelOk") : t("cuadrilla.estadoDesajustado");
    }
    if (tipo === "RESPIRATORIA") {
      if (nivel === "OK") return t("cuadrilla.estadoNormal");
      const fr = medicion?.frecuenciaRespiratoria;
      const flecha = fr == null ? "" : fr > DEFAULT_THRESHOLDS.respAlto ? " ↑" : fr < DEFAULT_THRESHOLDS.respBajo ? " ↓" : "";
      return t("cuadrilla.estadoAnomalo") + flecha;
    }
    return nivelLabel(nivel);
  };

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

  // En vivo: jornadas/alertas refetchean todo (dona de ajustes incluida);
  // la última medición de cada tarjeta se mergea directo del evento.
  useRealtime("jornadas", poll);
  useRealtime("alertas", poll);
  useRealtime<MedicionesEventMsg>("mediciones", (e) => {
    if (e?.jornadaId != null && e.ultima) {
      setMedicionesMap((prev) => ({ ...prev, [String(e.jornadaId)]: e.ultima ?? null }));
    }
  });

  // Finalizar jornada desde la web (la vista es solo de Admin/Supervisor): el
  // mismo endpoint que usa la app móvil. El trabajador se entera por su polling
  // de cierre remoto (≤30 s) y esta vista se refresca sola por el evento STOMP.
  // Guardarraíl de dominio: si el sensor sigue emitiendo, la confirmación lo
  // advierte — finalizar apaga el monitoreo de alguien posiblemente expuesto.
  async function confirmarFinalizar(jornada: JornadaTrabajo, nombre: string) {
    const medicion = medicionesMap[String(jornada.id)];
    const midiendo = esMedicionReciente(medicion?.timestamp);
    const detalle = midiendo
      ? t("cuadrilla.finalizarMidiendo")
      : medicion?.timestamp
        ? t("cuadrilla.finalizarUltimaSenal", { rel: formatRelativeTime(medicion.timestamp) })
        : t("cuadrilla.finalizarSinSenalTexto");
    const res = await Swal.fire({
      title: t("cuadrilla.finalizarTitulo"),
      text: `${nombre} — ${detalle}`,
      icon: midiendo ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: t("cuadrilla.finalizarConfirmar"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#ef4444",
    });
    if (!res.isConfirmed) return;
    try {
      await api.jornadas.finalizar(jornada.id);
      poll();
      Swal.fire({
        icon: "success",
        title: t("cuadrilla.finalizadaOk"),
        timer: 1600,
        showConfirmButton: false,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: t("cuadrilla.finalizarError"),
        text: e instanceof Error ? e.message : String(e),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  // Derived data
  const findTrabajador = (rut: string): Trabajador | undefined =>
    trabajadores.find((tr) => tr.rut === rut);

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
      <div style={{ width: size, height: size, position: "relative" }} title={`${t("cuadrilla.ajustadoLabel")}: ${pctAjustado}% | ${t("cuadrilla.desajustadoLabel")}: ${pctDesajustado}%`}>
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
    const tr = findTrabajador(jornada.rutUsuario);
    const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "CRITICO");
    const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "ALERTA");
    const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
    const medicion = medicionesMap[String(jornada.id)];
    // Sin señal reciente, el "NORMAL" verde sería mentira: el sensor calló.
    // Una alerta activa sí se sigue mostrando (el silencio no la apaga).
    const viva = esMedicionReciente(medicion?.timestamp);
    const sinSenal = !viva && estadoGeneral === "OK";
    const nombre = tr ? `${tr.nombre} ${tr.apellidoPaterno}` : jornada.rutUsuario;

    return (
      <div
        key={jornada.id}
        className="card"
        style={{ padding: "0.75rem", borderLeft: `3px solid ${sinSenal ? "var(--color-border)" : alertColor(estadoGeneral)}`, opacity: viva ? 1 : 0.75 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            {tr?.tieneImagen ? (
              <img src={`${API_URL}/trabajador/${tr.rut}/imagen/`} alt=""
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: "0.75rem",
              }}>
                {tr ? `${tr.nombre.charAt(0)}${tr.apellidoPaterno.charAt(0)}` : "?"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tr ? `${tr.nombre} ${tr.apellidoPaterno}` : jornada.rutUsuario}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}>
                {tr?.rut || jornada.rutUsuario}
              </p>
            </div>
          </div>
          {sinSenal ? (
            <span style={{
              fontSize: "0.6rem", fontWeight: 700, color: "var(--color-text-secondary)",
              letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            }}>
              {t("cuadrilla.sinSenal")}
            </span>
          ) : (
            <span className={alertAnimClass(estadoGeneral)} style={{
              fontSize: "0.6rem", fontWeight: 700, color: alertColor(estadoGeneral),
              letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            }}>
              {estadoLabel(estadoGeneral)}
            </span>
          )}
        </div>
        <div className="cuadrilla-alerts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
          {ALERTA_TIPOS.map((tipo) => {
            const nivel = getAlertNivel(alertas, jornada.rutUsuario, tipo);
            return (
              <div key={tipo} className={alertAnimClass(nivel)} style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                padding: "0.25rem 0.375rem", borderRadius: "0.25rem",
                color: alertColor(nivel), fontSize: "0.65rem", fontWeight: 600,
              }} title={`${TIPO_LABELS[tipo]}: ${estadoVariable(tipo, nivel, medicion)}`}>
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
            <p style={{ fontSize: "0.5rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "0.125rem" }}>{t("cuadrilla.fitLabel")}</p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.25rem 0.75rem",
            fontSize: "0.65rem",
            color: "var(--color-text-secondary)",
            flex: 1,
          }}>
            <span>{t("cuadrilla.respRateShort")}: <b style={{ color: "var(--color-text-primary)" }}>{fmtNum(medicion?.frecuenciaRespiratoria)} {t("cuadrilla.bpm")}</b></span>
            <span>{t("cuadrilla.fitLabel")}: <b style={{ color: nivelAjusteColor(medicion?.nivelAjuste) }}>{interpretNivelAjuste(medicion?.nivelAjuste)}</b></span>
            <span>{t("cuadrilla.clogLabel")}: <b style={{ color: nivelAtolloColor(medicion?.nivelAtollo) }}>{interpretNivelAtollo(medicion?.nivelAtollo)}</b></span>
            <span>{t("cuadrilla.batteryLabel")}: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.bateria != null ? `${fmtNum(medicion.bateria)}%` : '--'}</b></span>
          </div>
        </div>
        {medicion?.timestamp && (
          <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", textAlign: "right" }}>
            {formatRelativeTime(medicion.timestamp)}
          </p>
        )}
        <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t("cuadrilla.inicioLabel")}: <b style={{ color: "var(--color-text-primary)" }}>{new Date(jornada.inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
            {jornada.dispositivo ? ` · ${jornada.dispositivo}` : ""}
          </p>
          <button
            onClick={() => confirmarFinalizar(jornada, nombre)}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", padding: "0.3rem 0.6rem", color: "#ef4444", flexShrink: 0 }}
          >
            <Square size={11} />
            {t("cuadrilla.finalizarBtn")}
          </button>
        </div>
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
      const viva = esMedicionReciente(medicion?.timestamp);
      const sinSenal = !viva && estadoGeneral === "OK";
      const nombre = sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut;

      return (
        <div
          className="card"
          style={{ padding: "0.75rem", borderLeft: `3px solid ${sinSenal ? "var(--color-border)" : alertColor(estadoGeneral)}`, backgroundColor: "rgba(59,130,246,0.04)", opacity: viva ? 1 : 0.75 }}
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
                  {t("cuadrilla.supervisorBadge")}
                </p>
              </div>
            </div>
            <span className={alertAnimClass(estadoGeneral)} style={{
              fontSize: "0.6rem", fontWeight: 700, color: alertColor(estadoGeneral),
              letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            }}>
              {estadoLabel(estadoGeneral)}
            </span>
          </div>
          <div className="cuadrilla-alerts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
            {ALERTA_TIPOS.map((tipo) => {
              const nivel = getAlertNivel(alertas, supRut, tipo);
              return (
                <div key={tipo} className={alertAnimClass(nivel)} style={{
                  display: "flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.25rem 0.375rem", borderRadius: "0.25rem",
                  color: alertColor(nivel), fontSize: "0.65rem", fontWeight: 600,
                }} title={`${TIPO_LABELS[tipo]}: ${estadoVariable(tipo, nivel, medicion)}`}>
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
              <p style={{ fontSize: "0.5rem", color: "var(--color-text-secondary)", textAlign: "center", marginTop: "0.125rem" }}>{t("cuadrilla.fitLabel")}</p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.25rem 0.75rem",
              fontSize: "0.65rem",
              color: "var(--color-text-secondary)",
              flex: 1,
            }}>
              <span>{t("cuadrilla.respRateShort")}: <b style={{ color: "var(--color-text-primary)" }}>{fmtNum(medicion?.frecuenciaRespiratoria)} {t("cuadrilla.bpm")}</b></span>
              <span>{t("cuadrilla.fitLabel")}: <b style={{ color: nivelAjusteColor(medicion?.nivelAjuste) }}>{interpretNivelAjuste(medicion?.nivelAjuste)}</b></span>
              <span>{t("cuadrilla.clogLabel")}: <b style={{ color: nivelAtolloColor(medicion?.nivelAtollo) }}>{interpretNivelAtollo(medicion?.nivelAtollo)}</b></span>
              <span>{t("cuadrilla.batteryLabel")}: <b style={{ color: "var(--color-text-primary)" }}>{medicion?.bateria != null ? `${fmtNum(medicion.bateria)}%` : '--'}</b></span>
            </div>
          </div>
          {medicion?.timestamp && (
            <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", textAlign: "right" }}>
              {formatRelativeTime(medicion.timestamp)}
            </p>
          )}
          {supJornada && (
            <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t("cuadrilla.inicioLabel")}: <b style={{ color: "var(--color-text-primary)" }}>{new Date(supJornada.inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
                {supJornada.dispositivo ? ` · ${supJornada.dispositivo}` : ""}
              </p>
              <button
                onClick={() => confirmarFinalizar(supJornada, nombre)}
                className="btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", padding: "0.3rem 0.6rem", color: "#ef4444", flexShrink: 0 }}
              >
                <Square size={11} />
                {t("cuadrilla.finalizarBtn")}
              </button>
            </div>
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
                {t("cuadrilla.supervisorBadge")}
              </p>
            </div>
          </div>
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, color: "var(--color-text-secondary)",
            letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
            padding: "0.2rem 0.5rem", borderRadius: "9999px",
            backgroundColor: "rgba(139,148,158,0.1)", border: "1px solid rgba(139,148,158,0.2)",
          }}>
            {t("cuadrilla.inactive")}
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
            {count === 1 ? t("cuadrilla.supervisorWorkersOne", { count }) : t("cuadrilla.supervisorWorkersOther", { count })}
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
            {t("cuadrilla.emptyTitle")}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {t("cuadrilla.emptyDescription")}
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
              <div className="cuadrilla-trabajadores-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
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
                <span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 600, marginLeft: "0.5rem" }}>{t("cuadrilla.supShort")}</span>
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
              {t("cuadrilla.inactive")}
            </span>
          </td>
          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>—</td>
        </tr>
      );
    }

    const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "CRITICO");
    const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, supRut, tipo) === "ALERTA");
    const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
    const supJornada = jornadas.find(j => j.rutUsuario === supRut);
    const medicion = supJornada ? medicionesMap[String(supJornada.id)] : null;
    const sinSenal = !esMedicionReciente(medicion?.timestamp) && estadoGeneral === "OK";
    const nombre = sup ? `${sup.nombre} ${sup.apellidoPaterno}` : supRut;

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
              <span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 600, marginLeft: "0.5rem" }}>{t("cuadrilla.supShort")}</span>
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
                <span>{estadoVariable(tipo, nivel, medicion)}</span>
              </div>
            </td>
          );
        })}
        <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
          {fmtNum(medicion?.frecuenciaRespiratoria)} <span style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>{t("cuadrilla.bpm")}</span>
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
          {medicion?.bateria != null ? `${fmtNum(medicion.bateria)}%` : '--'}
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center" }}>
          {sinSenal ? (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>
              {t("cuadrilla.sinSenal")}
            </span>
          ) : (
            <span className={alertAnimClass(estadoGeneral)} style={{
              fontSize: "0.65rem", fontWeight: 700,
              color: alertColor(estadoGeneral), letterSpacing: "0.05em",
            }}>
              {estadoLabel(estadoGeneral)}
            </span>
          )}
        </td>
        <td style={{ padding: "0.75rem", textAlign: "center" }}>
          {supJornada ? (
            <button
              onClick={() => confirmarFinalizar(supJornada, nombre)}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", padding: "0.3rem 0.6rem", color: "#ef4444" }}
            >
              <Square size={11} />
              {t("cuadrilla.finalizarBtn")}
            </button>
          ) : (
            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>—</span>
          )}
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
            {t("cuadrilla.emptyTitle")}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {t("cuadrilla.emptyDescription")}
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
              <div className="card cuadrilla-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        {t("cuadrilla.tableWorker")}
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        {t("common.rut")}
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
                        {t("cuadrilla.respRateShort")}
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {t("cuadrilla.batteryLabel")}
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        {t("common.status")}
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>
                        {t("cuadrilla.accionesHeader")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderSupervisorTableRow(supRut)}
                    {workerJornadas.map((jornada) => {
                      const tr = findTrabajador(jornada.rutUsuario);
                      const hasCritico = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "CRITICO");
                      const hasAlerta = ALERTA_TIPOS.some((tipo) => getAlertNivel(alertas, jornada.rutUsuario, tipo) === "ALERTA");
                      const estadoGeneral: NivelAlerta = hasCritico ? "CRITICO" : hasAlerta ? "ALERTA" : "OK";
                      const medicion = medicionesMap[String(jornada.id)];
                      const sinSenal = !esMedicionReciente(medicion?.timestamp) && estadoGeneral === "OK";
                      const nombre = tr ? `${tr.nombre} ${tr.apellidoPaterno}` : jornada.rutUsuario;
                      return (
                        <tr key={jornada.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {tr?.tieneImagen ? (
                                <img src={`${API_URL}/trabajador/${tr.rut}/imagen/`} alt=""
                                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                              ) : (
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "white", fontWeight: 700, fontSize: "0.65rem",
                                }}>
                                  {tr ? `${tr.nombre.charAt(0)}${tr.apellidoPaterno.charAt(0)}` : "?"}
                                </div>
                              )}
                              <span style={{ fontWeight: 600 }}>
                                {tr ? `${tr.nombre} ${tr.apellidoPaterno}` : jornada.rutUsuario}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                            {tr?.rut || jornada.rutUsuario}
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
                                  <span>{estadoVariable(tipo, nivel, medicion)}</span>
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
                            {fmtNum(medicion?.frecuenciaRespiratoria)} <span style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>{t("cuadrilla.bpm")}</span>
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-primary)" }}>
                            {medicion?.bateria != null ? `${fmtNum(medicion.bateria)}%` : '--'}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            {sinSenal ? (
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>
                                {t("cuadrilla.sinSenal")}
                              </span>
                            ) : (
                              <span className={alertAnimClass(estadoGeneral)} style={{
                                fontSize: "0.65rem", fontWeight: 700,
                                color: alertColor(estadoGeneral), letterSpacing: "0.05em",
                              }}>
                                {estadoLabel(estadoGeneral)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <button
                              onClick={() => confirmarFinalizar(jornada, nombre)}
                              className="btn-secondary"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", padding: "0.3rem 0.6rem", color: "#ef4444" }}
                            >
                              <Square size={11} />
                              {t("cuadrilla.finalizarBtn")}
                            </button>
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
      <div className="cuadrilla-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="cuadrilla-title" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            {t("cuadrilla.title")}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t("cuadrilla.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <button onClick={poll} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-secondary)", padding: "0.25rem",
            display: "flex", alignItems: "center",
            marginRight: "0.5rem",
          }} title={t("cuadrilla.refreshNow")} aria-label={t("cuadrilla.refreshNow")}>
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={viewMode === "cards" ? "btn-primary" : "btn-secondary"}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          >
            <LayoutGrid size={15} />
            {t("cuadrilla.viewCards")}
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "btn-primary" : "btn-secondary"}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          >
            <Table size={15} />
            {t("cuadrilla.viewTable")}
          </button>
        </div>
      </div>

      {/* Resumen Jornada Actual (mismo bloque que la página Resumen, lo más arriba) */}
      <ResumenJornadaActual jornadas={jornadas} medicionesMap={medicionesMap} alertas={alertas} />

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
          {t("cuadrilla.pollingError")}
        </div>
      )}

      {/* Content */}
      <div style={{ transition: "opacity 0.2s ease" }} key={viewMode}>
        {viewMode === "cards" ? renderCards() : renderTable()}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .cuadrilla-trabajadores-grid {
            grid-template-columns: 1fr !important;
          }
          .cuadrilla-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)) !important;
          }
        }
        @media (max-width: 768px) {
          .cuadrilla-header {
            margin-bottom: 1rem !important;
          }
          .cuadrilla-title {
            font-size: 1.25rem !important;
          }
          .cuadrilla-trabajadores-grid {
            grid-template-columns: 1fr !important;
          }
          .cuadrilla-alerts-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .cuadrilla-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .cuadrilla-table-wrap {
            overflow-x: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
