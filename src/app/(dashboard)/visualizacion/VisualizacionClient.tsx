"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/api/client";
import type { Trabajador, JornadaTrabajo, AlertaHistorial, TipoAlerta, NivelAlerta, PageResponse } from "@/types";
import { Wind, Wrench, Activity, Battery, Wifi, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import { API_BASE_URL as API_URL } from "@/api/endpoints";
import { abrirCalendario } from "@/utils/datePicker";

const ALERTA_TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];

const TIPO_ICONS: Record<TipoAlerta, React.ReactNode> = {
  RESPIRATORIA: <Wind size={13} />,
  AJUSTE: <Wrench size={13} />,
  FILTRO: <Activity size={13} />,
  BATERIA: <Battery size={13} />,
  DESCONEXION: <Wifi size={13} />,
};

function alertColor(nivel: NivelAlerta): string {
  if (nivel === "OK") return "#22c55e";
  if (nivel === "ALERTA") return "#f59e0b";
  return "#ef4444";
}

interface WorkerAlertSummary {
  rut: string;
  counts: Record<TipoAlerta, { ok: number; alerta: number; critico: number }>;
  worstLevel: NivelAlerta;
  totalAlertas: number;
  jornadas: number;
  jornadaList: JornadaTrabajo[];
}

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
    BATERIA: t("visualizacion.tipo.bateria"),
    DESCONEXION: t("visualizacion.tipo.desconexion"),
  };
  const [loading, setLoading] = useState(false);
  const [filterSupervisor, setFilterSupervisor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

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

  const fetchData = useCallback(async (page: number, sup?: string, desde?: string, hasta?: string) => {
    setLoading(true);
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

      // Fetch alerts for each unique worker in the jornada results
      const workerRuts = [...new Set((jornadaData.content || []).map((j) => j.rutUsuario))];
      let allAlertas: AlertaHistorial[] = [];

      if (workerRuts.length > 0) {
        // Fetch alerts by worker, filtered by date range if provided
        const alertPromises = workerRuts.map((rut) =>
          api.alertas.byTrabajador(rut).catch(() => [] as AlertaHistorial[])
        );
        const alertResults = await Promise.all(alertPromises);
        allAlertas = alertResults.flat();

        // Filter alerts by date range if specified
        if (desde) {
          const desdeDate = new Date(desde);
          allAlertas = allAlertas.filter((a) => new Date(a.timestamp) >= desdeDate);
        }
        if (hasta) {
          const hastaDate = new Date(hasta);
          allAlertas = allAlertas.filter((a) => new Date(a.timestamp) <= hastaDate);
        }
      }

      setJornadaPage(jornadaData);
      setAlertas(allAlertas);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (err) {
      console.error("Error:", err);
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: t("visualizacion.errorLoadHistory"),
        background: "#1c2333",
        color: "#e6edf3",
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load initial data on mount
  useEffect(() => {
    fetchData(0);
  }, [fetchData]);

  function handleSearch() {
    fetchData(0, filterSupervisor, fechaDesde, fechaHasta);
  }

  function handleClear() {
    setFilterSupervisor("");
    setFechaDesde("");
    setFechaHasta("");
    fetchData(0);
  }

  // Build worker alert summaries from jornadas and alerts.
  // Este histórico es solo de jornadas TERMINADAS. El backend ya filtra terminada=true,
  // pero filtramos defensivamente para no mostrar jornadas activas si la fuente cambia.
  const jornadas = (jornadaPage?.content || []).filter((j) => j.terminada);

  // Navega al detalle de una alerta (ruta existente: /historial-alertas/[id]).
  const abrirAlerta = (id: number) => router.push(`/historial-alertas/${id}`);

  // Group jornadas by supervisor
  const jornadasPorSupervisor: Record<string, JornadaTrabajo[]> = {};
  for (const j of jornadas) {
    const key = j.idSupervisor || "sin-supervisor";
    if (!jornadasPorSupervisor[key]) jornadasPorSupervisor[key] = [];
    jornadasPorSupervisor[key].push(j);
  }

  // Build worker summaries within each supervisor group
  function buildWorkerSummaries(supJornadas: JornadaTrabajo[]): WorkerAlertSummary[] {
    const workerMap: Record<string, WorkerAlertSummary> = {};

    for (const j of supJornadas) {
      if (!workerMap[j.rutUsuario]) {
        const counts = {} as Record<TipoAlerta, { ok: number; alerta: number; critico: number }>;
        for (const tipo of ALERTA_TIPOS) {
          counts[tipo] = { ok: 0, alerta: 0, critico: 0 };
        }
        workerMap[j.rutUsuario] = {
          rut: j.rutUsuario,
          counts,
          worstLevel: "OK",
          totalAlertas: 0,
          jornadas: 0,
          jornadaList: [],
        };
      }
      workerMap[j.rutUsuario].jornadas++;
      workerMap[j.rutUsuario].jornadaList.push(j);
    }

    // Count alerts per worker per type
    for (const alerta of alertas) {
      const worker = workerMap[alerta.rutTrabajador];
      if (!worker) continue;
      const tipo = alerta.tipo;
      if (!ALERTA_TIPOS.includes(tipo)) continue;

      if (alerta.nivel === "CRITICO") {
        worker.counts[tipo].critico++;
        worker.totalAlertas++;
      } else if (alerta.nivel === "ALERTA") {
        worker.counts[tipo].alerta++;
        worker.totalAlertas++;
      } else {
        worker.counts[tipo].ok++;
      }
    }

    // Compute worst level per worker
    for (const worker of Object.values(workerMap)) {
      let worst: NivelAlerta = "OK";
      for (const tipo of ALERTA_TIPOS) {
        if (worker.counts[tipo].critico > 0) {
          worst = "CRITICO";
          break;
        }
        if (worker.counts[tipo].alerta > 0) {
          worst = "ALERTA";
        }
      }
      worker.worstLevel = worst;
    }

    // Sort: CRITICO first, then ALERTA, then OK; within same level by totalAlertas desc
    const levelOrder: Record<NivelAlerta, number> = { CRITICO: 0, ALERTA: 1, OK: 2 };
    return Object.values(workerMap).sort((a, b) => {
      const levelDiff = levelOrder[a.worstLevel] - levelOrder[b.worstLevel];
      if (levelDiff !== 0) return levelDiff;
      return b.totalAlertas - a.totalAlertas;
    });
  }

  function getTypeWorstLevel(counts: { ok: number; alerta: number; critico: number }): NivelAlerta {
    if (counts.critico > 0) return "CRITICO";
    if (counts.alerta > 0) return "ALERTA";
    return "OK";
  }

  function getTypeAlertCount(counts: { ok: number; alerta: number; critico: number }): number {
    return counts.alerta + counts.critico;
  }

  // Alertas asociadas a una jornada concreta: por jornadaId si existe; si no, por
  // trabajador + ventana temporal de la jornada (inicio..fin).
  function alertasDeJornada(j: JornadaTrabajo): AlertaHistorial[] {
    const ini = new Date(j.inicio).getTime();
    const fin = j.fin ? new Date(j.fin).getTime() : Date.now();
    return alertas.filter((a) => {
      if (a.rutTrabajador !== j.rutUsuario) return false;
      if (a.jornadaId != null) return a.jornadaId === j.id;
      const ts = new Date(a.timestamp).getTime();
      return ts >= ini && ts <= fin;
    });
  }

  // Barra temporal de una jornada terminada con sus alertas posicionadas por timestamp.
  function renderJornadaTimeline(j: JornadaTrabajo) {
    const ini = new Date(j.inicio).getTime();
    const fin = j.fin ? new Date(j.fin).getTime() : ini;
    const span = Math.max(fin - ini, 1); // evitar división por cero
    const jAlertas = alertasDeJornada(j).filter((a) => a.nivel !== "OK");

    const fmtHora = (iso: string) =>
      new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const fmtFecha = (iso: string) =>
      new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });

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
                  border: "2px solid var(--color-bg-card, #1c2333)",
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

  // Render
  function renderWorkerCard(summary: WorkerAlertSummary) {
    const trab = findTrabajador(summary.rut);
    const borderColor = alertColor(summary.worstLevel);

    return (
      <div
        key={summary.rut}
        className="card"
        style={{ padding: "0.75rem", borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Worker info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            {trab?.tieneImagen ? (
              <img
                src={`${API_URL}/trabajador/${trab.rut}/imagen/`}
                alt=""
                style={{
                  width: 32, height: 32, borderRadius: "50%", objectFit: "cover",
                  flexShrink: 0, border: "1px solid var(--color-border)",
                }}
              />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: "0.75rem",
              }}>
                {trab ? `${trab.nombre.charAt(0)}${trab.apellidoPaterno.charAt(0)}` : "?"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontWeight: 700, fontSize: "0.85rem",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {trab ? `${trab.nombre} ${trab.apellidoPaterno}` : summary.rut}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.65rem" }}>
                {summary.rut} · {t("visualizacion.shiftsCount", { count: summary.jornadas })}
              </p>
            </div>
          </div>
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, color: alertColor(summary.worstLevel),
            letterSpacing: "0.05em", flexShrink: 0, marginLeft: "0.5rem",
          }}>
            {summary.worstLevel === "OK" ? t("visualizacion.statusNormal") : summary.worstLevel}
          </span>
        </div>

        {/* Alert type grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
          {ALERTA_TIPOS.map((tipo) => {
            const typeLevel = getTypeWorstLevel(summary.counts[tipo]);
            const count = getTypeAlertCount(summary.counts[tipo]);
            return (
              <div
                key={tipo}
                style={{
                  display: "flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.25rem 0.375rem", borderRadius: "0.25rem",
                  color: alertColor(typeLevel), fontSize: "0.65rem", fontWeight: 600,
                }}
                title={`${TIPO_LABELS[tipo]}: ${t("visualizacion.alertsCount", { count })}`}
              >
                {TIPO_ICONS[tipo]}
                <span>{TIPO_LABELS[tipo]}</span>
                {count > 0 && (
                  <span style={{
                    marginLeft: "auto",
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    backgroundColor: `${alertColor(typeLevel)}15`,
                    padding: "0.0625rem 0.25rem",
                    borderRadius: "9999px",
                    minWidth: "16px",
                    textAlign: "center",
                  }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Línea de tiempo: una barra por jornada terminada con sus alertas posicionadas */}
        {summary.jornadaList.length > 0 && (
          <div style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "0.5rem",
            marginTop: "0.5rem",
          }}>
            <p style={{
              fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em",
              color: "var(--color-text-secondary)", marginBottom: "0.25rem",
            }}>
              {t("visualizacion.statShifts").toUpperCase()}
            </p>
            {summary.jornadaList
              .slice()
              .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())
              .map((j) => renderJornadaTimeline(j))}
            <p style={{
              fontSize: "0.55rem", color: "var(--color-text-secondary)",
              marginTop: "0.375rem", fontStyle: "italic",
            }}>
              Clic en un punto para ver el detalle de la alerta
            </p>
          </div>
        )}

        {/* Total alerts footer */}
        {summary.totalAlertas > 0 && (
          <div style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "0.5rem",
            marginTop: "0.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.7rem",
            color: "var(--color-text-secondary)",
          }}>
            <span>{t("visualizacion.totalAlertsPeriod")}</span>
            <span style={{
              fontWeight: 700,
              color: alertColor(summary.worstLevel),
            }}>
              {summary.totalAlertas}
            </span>
          </div>
        )}
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
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
          {t("visualizacion.title")}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {t("visualizacion.subtitle")}
        </p>
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <Search size={15} /> {t("common.search")}
          </button>
          {(filterSupervisor || fechaDesde || fechaHasta) && (
            <button className="btn-secondary" onClick={handleClear} style={{ fontSize: "0.8rem" }}>
              {t("visualizacion.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
          {t("visualizacion.loadingHistory")}
        </div>
      ) : !hasSearched ? null : jornadas.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
          <p style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{t("visualizacion.noResults")}</p>
          <p style={{ fontSize: "0.85rem" }}>
            {t("visualizacion.noShiftsForFilters")}
          </p>
        </div>
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
                  {Object.keys(jornadasPorSupervisor).length}
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

          {/* Supervisor groups with worker cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Object.entries(jornadasPorSupervisor).map(([supRut, supJornadas]) => {
              const summaries = buildWorkerSummaries(supJornadas);
              const uniqueWorkers = summaries.length;
              const groupTotalAlertas = summaries.reduce((sum, s) => sum + s.totalAlertas, 0);

              return (
                <div key={supRut}>
                  {renderSupervisorHeader(supRut, uniqueWorkers, groupTotalAlertas)}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "0.75rem",
                  }}>
                    {summaries.map((summary) => renderWorkerCard(summary))}
                  </div>
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
                disabled={isFirst}
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
                disabled={isLast}
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
