"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/api/client";
import type { Trabajador, JornadaTrabajo, AlertaHistorial, TipoAlerta, NivelAlerta, PageResponse } from "@/types";
import { Wind, Wrench, Activity, Battery, Wifi, Hourglass, ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { API_BASE_URL as API_URL } from "@/api/endpoints";
import { abrirCalendario } from "@/utils/datePicker";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRealtime } from "@/realtime/RealtimeProvider";
import { nivelColor } from "@/utils/alertaTokens";
import { formatFecha, formatHora } from "@/utils/fechas";
import {
  agruparPorDiaYSupervisor,
  colorSupervisor,
  duracionMinutos,
  formatDuracion,
  SIN_SUPERVISOR,
} from "@/utils/historicoCuadrilla";
import CalendarioSemanal from "./CalendarioSemanal";
import EmptyState from "@/components/EmptyState";

type VistaHistorico = "lista" | "calendario";
const VISTA_STORAGE_KEY = "visualizacion.vista";

const ALERTA_TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];
const FILTER_DEBOUNCE_MS = 350;

const TIPO_ICONS: Record<TipoAlerta, React.ReactNode> = {
  RESPIRATORIA: <Wind size={13} />,
  AJUSTE: <Wrench size={13} />,
  FILTRO: <Activity size={13} />,
  FILTRO_VIDA_UTIL: <Hourglass size={13} />,
  BATERIA: <Battery size={13} />,
  DESCONEXION: <Wifi size={13} />,
};

const alertColor = nivelColor;

interface Props {
  trabajadores: Trabajador[];
}

export default function VisualizacionClient({ trabajadores }: Props) {
  const t = useT();
  const router = useRouter();
  const TIPO_LABELS: Record<TipoAlerta, string> = {
    RESPIRATORIA: t("visualizacion.tipo.respiratoria"),
    AJUSTE: t("visualizacion.tipo.ajuste"),
    FILTRO: t("visualizacion.tipo.filtro"),
    FILTRO_VIDA_UTIL: t("visualizacion.tipo.filtroVidaUtil"),
    BATERIA: t("visualizacion.tipo.bateria"),
    DESCONEXION: t("visualizacion.tipo.desconexion"),
  };
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filterSupervisor, setFilterSupervisor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Toggle Lista | Calendario, persistido por usuario del navegador.
  const [vista, setVista] = useState<VistaHistorico>("lista");
  useEffect(() => {
    const stored = localStorage.getItem(VISTA_STORAGE_KEY);
    if (stored === "calendario") setVista("calendario");
  }, []);
  function cambiarVista(v: VistaHistorico) {
    setVista(v);
    localStorage.setItem(VISTA_STORAGE_KEY, v);
  }

  // Paginated jornada data
  const [jornadaPage, setJornadaPage] = useState<PageResponse<JornadaTrabajo> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // All alerts for the period (fetched separately)
  const [alertas, setAlertas] = useState<AlertaHistorial[]>([]);

  const supervisores = trabajadores.filter(
    (t) => t.cargo === "Supervisor" || t.cargo === "Administrador"
  );

  const findTrabajador = (rut: string): Trabajador | undefined =>
    trabajadores.find((t) => t.rut === rut);

  // Secuencia de peticiones: si dos consultas se solapan (ej. cambiar un filtro y
  // paginar casi a la vez), solo la última aplica su resultado y apaga el loading.
  // Evita que una respuesta lenta y vieja pise a una nueva (out-of-order).
  const fetchSeq = useRef(0);

  const fetchData = useCallback(async (page: number, sup?: string, desde?: string, hasta?: string) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setLoadError(false);
    try {
      const jornadaParams: { supervisor?: string; inicio?: string; fin?: string } = {};
      if (sup) jornadaParams.supervisor = sup;
      if (desde) jornadaParams.inicio = desde;
      if (hasta) jornadaParams.fin = hasta;

      const jornadaData = await api.jornadas.historial(
        page,
        200,
        Object.keys(jornadaParams).length > 0 ? jornadaParams : undefined
      );

      // Alertas ligadas a las jornadas de ESTA página, en una sola consulta al
      // backend. Antes: un GET con el historial completo de cada trabajador
      // (sin límite ni fechas) — con el volumen real de producción el fan-out
      // tumbaba la vista completa.
      const jornadaIds = (jornadaData.content || [])
        .map((j) => j.id)
        .filter((id): id is number => id != null);
      const allAlertas: AlertaHistorial[] =
        jornadaIds.length > 0 ? await api.alertas.porJornadas(jornadaIds) : [];

      if (seq !== fetchSeq.current) return; // superada por una consulta más reciente
      setJornadaPage(jornadaData);
      setAlertas(allAlertas);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      console.error("Error:", err);
      // Error inline (no modal bloqueante): la vista queda usable y ofrece reintentar.
      setLoadError(true);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  // Filtros de servidor (supervisor + rango de fechas), auto-aplicados sin botón.
  const serverFilters = useMemo(
    () => ({ filterSupervisor, fechaDesde, fechaHasta }),
    [filterSupervisor, fechaDesde, fechaHasta]
  );
  const debouncedFilters = useDebouncedValue(serverFilters, FILTER_DEBOUNCE_MS);

  // Un cambio de filtro se está "asentando" (esperando su debounce) mientras el
  // snapshot debounced no coincide con los filtros vivos. Durante ese lapso la
  // paginación se deshabilita: está por resetear a la página 0.
  const filtersSettling = serverFilters !== debouncedFilters;

  // Carga inicial (filtros vacíos) y re-consulta al cambiarlos. El debounce agrupa
  // la edición del rango de fechas para no consultar por cada tecla.
  useEffect(() => {
    const { filterSupervisor: sup, fechaDesde: fd, fechaHasta: fh } = debouncedFilters;
    // Rango inválido (desde >= hasta): espera a que sea coherente, sin errorar.
    if (fd && fh && new Date(fd) >= new Date(fh)) return;
    fetchData(0, sup, fd, fh);
  }, [debouncedFilters, fetchData]);

  function handleClear() {
    setFilterSupervisor("");
    setFechaDesde("");
    setFechaHasta("");
  }

  // En vivo: al finalizar una jornada (desde la app o desde Estado de Cuadrilla)
  // el registro aparece aquí sin recargar. fetchSeq descarta respuestas viejas.
  useRealtime("jornadas", () => {
    if (filtersSettling) return;
    const { filterSupervisor: sup, fechaDesde: fd, fechaHasta: fh } = debouncedFilters;
    fetchData(currentPage, sup, fd, fh);
  });

  // Build worker alert summaries from jornadas and alerts.
  // Este histórico es solo de jornadas TERMINADAS. El backend ya filtra terminada=true,
  // pero filtramos defensivamente para no mostrar jornadas activas si la fuente cambia.
  const jornadas = (jornadaPage?.content || []).filter((j) => j.terminada);

  // Navega al detalle de una alerta (ruta existente: /historial-alertas/[id]).
  const abrirAlerta = (id: number) => router.push(`/historial-alertas/${id}`);

  // Reorganización 2026-08-02 (pedido de Nico): la lista se agrupa por FECHA y
  // dentro por supervisor — el modelo mental es "qué pasó tal día con tal
  // cuadrilla", no "qué acumuló cada trabajador en la página".
  const grupos = agruparPorDiaYSupervisor(jornadas);
  const supervisoresCount = new Set(jornadas.map((j) => j.idSupervisor || SIN_SUPERVISOR)).size;

  // Alertas asociadas a una jornada concreta. El endpoint por-jornadas ya trae
  // solo alertas ligadas por jornada_id, así que el match es directo.
  function alertasDeJornada(j: JornadaTrabajo): AlertaHistorial[] {
    return alertas.filter((a) => a.jornadaId === j.id);
  }

  // Barra temporal de una jornada terminada con sus alertas posicionadas por timestamp.
  function renderJornadaTimeline(j: JornadaTrabajo) {
    const ini = new Date(j.inicio).getTime();
    const fin = j.fin ? new Date(j.fin).getTime() : ini;
    const span = Math.max(fin - ini, 1); // evitar división por cero
    const jAlertas = alertasDeJornada(j).filter((a) => a.nivel !== "OK");

    const fmtHora = formatHora;
    const fmtFecha = formatFecha;

    return (
      <div key={j.id} style={{ marginTop: "0.5rem" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "0.6rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem",
        }}>
          <span>{fmtFecha(j.inicio)} · {fmtHora(j.inicio)}</span>
          <span>{j.fin ? fmtHora(j.fin) : "—"}</span>
        </div>
        <div style={{
          position: "relative",
          height: 10,
          borderRadius: "9999px",
          backgroundColor: "rgba(255,255,255,0.07)",
          border: "1px solid var(--color-border)",
        }}>
          {jAlertas.map((a) => {
            const ts = new Date(a.timestamp).getTime();
            // Clamp 0..100 para alertas fuera del rango exacto de la jornada.
            const pct = Math.min(100, Math.max(0, ((ts - ini) / span) * 100));
            return (
              <button
                key={a.id}
                onClick={(e) => { e.stopPropagation(); abrirAlerta(a.id); }}
                title={`${a.tipo} · ${a.nivel} · ${fmtHora(a.timestamp)}${a.descripcion ? ` — ${a.descripcion}` : ""}`}
                aria-label={`Ver alerta ${a.tipo} ${a.nivel}`}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: alertColor(a.nivel),
                  border: "2px solid var(--color-bg-card, var(--color-bg-card))",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Fila compacta de UNA jornada: trabajador, horario, duración, badges de los
  // tipos con alertas de ESA jornada y su línea de tiempo clickeable.
  function renderJornadaRow(j: JornadaTrabajo, supervisorKey: string) {
    const trab = findTrabajador(j.rutUsuario);
    const jAlertas = alertasDeJornada(j).filter((a) => a.nivel !== "OK");
    const porTipo = new Map<TipoAlerta, { count: number; peor: NivelAlerta }>();
    for (const a of jAlertas) {
      const actual = porTipo.get(a.tipo) ?? { count: 0, peor: "ALERTA" as NivelAlerta };
      actual.count++;
      if (a.nivel === "CRITICO") actual.peor = "CRITICO";
      porTipo.set(a.tipo, actual);
    }

    return (
      <div
        key={j.id}
        className="card"
        style={{ padding: "0.625rem 0.75rem", borderLeft: `3px solid ${colorSupervisor(supervisorKey)}` }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
          {trab?.tieneImagen ? (
            <img
              src={`${API_URL}/trabajador/${trab.rut}/imagen/`}
              alt=""
              style={{
                width: 28, height: 28, borderRadius: "50%", objectFit: "cover",
                flexShrink: 0, border: "1px solid var(--color-border)",
              }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "0.65rem",
            }}>
              {trab ? `${trab.nombre.charAt(0)}${trab.apellidoPaterno.charAt(0)}` : "?"}
            </div>
          )}
          <div style={{ minWidth: 0, flex: "1 1 140px" }}>
            <p style={{
              fontWeight: 700, fontSize: "0.82rem",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {trab ? `${trab.nombre} ${trab.apellidoPaterno}` : j.rutUsuario}
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}>
              {j.rutUsuario}
            </p>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
            {formatHora(j.inicio)}{j.fin ? ` – ${formatHora(j.fin)}` : ""}
            <span style={{ marginLeft: "0.375rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {formatDuracion(duracionMinutos(j.inicio, j.fin))}
            </span>
          </div>
          {/* Badges: solo los tipos con alertas en esta jornada */}
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {[...porTipo.entries()].map(([tipo, info]) => (
              <span
                key={tipo}
                title={`${TIPO_LABELS[tipo]}: ${info.count}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.2rem",
                  padding: "0.125rem 0.375rem", borderRadius: "9999px",
                  backgroundColor: `${alertColor(info.peor)}18`,
                  color: alertColor(info.peor), fontSize: "0.62rem", fontWeight: 800,
                }}
              >
                {TIPO_ICONS[tipo]} {info.count}
              </span>
            ))}
            {jAlertas.length === 0 && (
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#22c55e" }}>
                {t("visualizacion.statusNormal")}
              </span>
            )}
          </div>
        </div>
        {renderJornadaTimeline(j)}
      </div>
    );
  }

  function renderSupervisorHeader(supRut: string, workerCount: number, totalGroupAlertas: number) {
    const sup = findTrabajador(supRut);
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "0.625rem",
        marginBottom: "0.75rem", marginTop: "0.5rem",
      }}>
        {sup?.tieneImagen ? (
          <img
            src={`${API_URL}/trabajador/${sup.rut}/imagen/`}
            alt=""
            style={{
              width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
              border: "1px solid var(--color-accent)",
            }}
          />
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
            {t("roles.supervisor")} · {t("visualizacion.workersCount", { count: workerCount })}
            {totalGroupAlertas > 0 && (
              <span style={{ color: "#f59e0b", marginLeft: "0.5rem" }}>
                · {t("visualizacion.alertsCount", { count: totalGroupAlertas })}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  const totalJornadas = jornadaPage?.totalElements || 0;
  const totalPages = jornadaPage?.totalPages || 0;
  const isFirst = jornadaPage?.first ?? true;
  const isLast = jornadaPage?.last ?? true;

  return (
    <div>
      {/* Header + toggle Lista | Calendario */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            {t("visualizacion.title")}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t("visualizacion.subtitle")}
          </p>
        </div>
        <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          {([
            { key: "lista" as const, icon: <List size={15} />, label: t("visualizacion.vistaLista") },
            { key: "calendario" as const, icon: <CalendarDays size={15} />, label: t("visualizacion.vistaCalendario") },
          ]).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => cambiarVista(key)}
              aria-pressed={vista === key}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                padding: "0.45rem 0.875rem", fontSize: "0.8rem", fontWeight: 700,
                border: "none", cursor: "pointer",
                backgroundColor: vista === key ? "var(--color-accent)" : "transparent",
                color: vista === key ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{
        marginBottom: "1.5rem", display: "flex", flexWrap: "wrap",
        gap: "0.75rem", alignItems: "flex-end",
      }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{
            display: "block", fontSize: "0.75rem",
            color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: "0.25rem",
          }}>{t("roles.supervisor")}</label>
          <select
            className="input-field"
            value={filterSupervisor}
            onChange={(e) => setFilterSupervisor(e.target.value)}
          >
            <option value="">{t("common.all")}</option>
            {supervisores.map((s) => (
              <option key={s.rut} value={s.rut}>
                {s.nombre} {s.apellidoPaterno}
              </option>
            ))}
          </select>
        </div>
        {/* En calendario el rango lo maneja la navegación de semana */}
        {vista === "lista" && (
          <>
            <div style={{ flex: "0 1 220px" }}>
              <label style={{
                display: "block", fontSize: "0.75rem",
                color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: "0.25rem",
              }}>{t("historialAlertas.from")}</label>
              <input
                className="input-field"
                type="datetime-local"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                onClick={abrirCalendario}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div style={{ flex: "0 1 220px" }}>
              <label style={{
                display: "block", fontSize: "0.75rem",
                color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: "0.25rem",
              }}>{t("historialAlertas.to")}</label>
              <input
                className="input-field"
                type="datetime-local"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                onClick={abrirCalendario}
                style={{ cursor: "pointer" }}
              />
            </div>
          </>
        )}
        {(filterSupervisor || fechaDesde || fechaHasta) && vista === "lista" && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn-secondary" onClick={handleClear} style={{ fontSize: "0.8rem" }}>
              {t("visualizacion.clear")}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {vista === "calendario" ? (
        <CalendarioSemanal trabajadores={trabajadores} filterSupervisor={filterSupervisor} />
      ) : loading ? (
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
            onClick={() => fetchData(currentPage, filterSupervisor, fechaDesde, fechaHasta)}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : !hasSearched ? null : jornadas.length === 0 ? (
        <EmptyState title={t("visualizacion.noResults")} hint={t("visualizacion.noShiftsForFilters")} />
      ) : (
        <>
          {/* Summary stats */}
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.75rem",
              textAlign: "center",
            }}>
              <div style={{ padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(249,115,22,0.08)" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f97316" }}>{totalJornadas}</p>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("visualizacion.statShifts")}</p>
              </div>
              <div style={{ padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(59,130,246,0.08)" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#3b82f6" }}>
                  {new Set(jornadas.map((j) => j.rutUsuario)).size}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("visualizacion.statWorkers")}</p>
              </div>
              <div style={{ padding: "0.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(59,130,246,0.08)" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#3b82f6" }}>
                  {supervisoresCount}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("visualizacion.statSupervisors")}</p>
              </div>
              <div style={{
                padding: "0.5rem", borderRadius: "0.5rem",
                backgroundColor: alertas.length > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
              }}>
                <p style={{
                  fontSize: "1.5rem", fontWeight: 800,
                  color: alertas.length > 0 ? "#f59e0b" : "#22c55e",
                }}>
                  {alertas.filter((a) => a.nivel !== "OK").length}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("visualizacion.statAlerts")}</p>
              </div>
              <div style={{
                padding: "0.5rem", borderRadius: "0.5rem",
                backgroundColor: alertas.some((a) => a.nivel === "CRITICO") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
              }}>
                <p style={{
                  fontSize: "1.5rem", fontWeight: 800,
                  color: alertas.some((a) => a.nivel === "CRITICO") ? "#ef4444" : "#22c55e",
                }}>
                  {alertas.filter((a) => a.nivel === "CRITICO").length}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{t("visualizacion.statCritical")}</p>
              </div>
            </div>
          </div>

          {/* Días (desc) → supervisores → jornadas compactas */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {grupos.map((dia) => {
              const jornadasDelDia = dia.supervisores.reduce((n, s) => n + s.jornadas.length, 0);
              return (
                <div key={dia.diaKey}>
                  {/* Header de día sticky: ancla visual al recorrer el historial */}
                  <div style={{
                    position: "sticky", top: 0, zIndex: 5,
                    backgroundColor: "var(--color-bg-primary)",
                    padding: "0.5rem 0", marginBottom: "0.375rem",
                    display: "flex", alignItems: "baseline", gap: "0.5rem",
                    borderBottom: "2px solid var(--color-border)",
                  }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "capitalize" }}>
                      {formatFecha(dia.fecha.toISOString())}
                    </h2>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                      {t("visualizacion.shiftsCount", { count: jornadasDelDia })}
                    </span>
                  </div>
                  {dia.supervisores.map((grupo) => {
                    const trabajadoresUnicos = new Set(grupo.jornadas.map((j) => j.rutUsuario)).size;
                    const alertasGrupo = grupo.jornadas.reduce(
                      (n, j) => n + alertasDeJornada(j).filter((a) => a.nivel !== "OK").length, 0
                    );
                    return (
                      <div key={`${dia.diaKey}-${grupo.supervisorRut}`} style={{ marginBottom: "0.75rem" }}>
                        {renderSupervisorHeader(grupo.supervisorRut, trabajadoresUnicos, alertasGrupo)}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                          gap: "0.625rem",
                        }}>
                          {grupo.jornadas.map((j) => renderJornadaRow(j, grupo.supervisorRut))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: "0.75rem", marginTop: "1.5rem",
            }}>
              <button
                className="btn-secondary"
                disabled={isFirst || loading || filtersSettling}
                onClick={() => fetchData(currentPage - 1, filterSupervisor, fechaDesde, fechaHasta)}
                style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}
              >
                <ChevronLeft size={16} /> {t("common.previous")}
              </button>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {t("visualizacion.pageOf", {
                  page: (jornadaPage?.number ?? 0) + 1,
                  total: totalPages,
                  records: totalJornadas,
                })}
              </span>
              <button
                className="btn-secondary"
                disabled={isLast || loading || filtersSettling}
                onClick={() => fetchData(currentPage + 1, filterSupervisor, fechaDesde, fechaHasta)}
                style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}
              >
                {t("common.next")} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .card { padding: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}
