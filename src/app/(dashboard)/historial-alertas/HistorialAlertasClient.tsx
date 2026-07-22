"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/api/client";
import type { AlertaHistorial, TipoAlerta, NivelAlerta, PageResponse } from "@/types";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { abrirCalendario } from "@/utils/datePicker";
import { formatValorAlerta } from "@/utils/sensorMappings";
import { buildAlertasServerParams, type FiltrosHistorialAlertas } from "@/utils/alertasQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface Props {
  initialPage: PageResponse<AlertaHistorial>;
}

const TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];
const NIVELES: NivelAlerta[] = ["OK", "ALERTA", "CRITICO"];
const PAGE_SIZE = 20;
const FILTER_DEBOUNCE_MS = 350;

function nivelBadgeClass(nivel: NivelAlerta): string {
  if (nivel === "CRITICO") return "badge-red";
  if (nivel === "ALERTA") return "badge-yellow";
  return "badge-green";
}

function getInitials(nombre?: string, apellido?: string): string {
  const n = nombre?.charAt(0)?.toUpperCase() || "";
  const a = apellido?.charAt(0)?.toUpperCase() || "";
  return n + a || "??";
}

export default function HistorialAlertasClient({ initialPage }: Props) {
  // useSearchParams requiere un boundary de Suspense en Next.js 15.
  return (
    <Suspense fallback={null}>
      <HistorialAlertasInner initialPage={initialPage} />
    </Suspense>
  );
}

function HistorialAlertasInner({ initialPage }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [alertas, setAlertas] = useState<AlertaHistorial[]>(initialPage.content);
  const [totalElements, setTotalElements] = useState(initialPage.totalElements);
  const [serverTotalPages, setServerTotalPages] = useState(initialPage.totalPages);
  const [currentPage, setCurrentPage] = useState(initialPage.number);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Filter state
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [trabajadorSearch, setTrabajadorSearch] = useState("");
  const [tipo, setTipo] = useState<TipoAlerta | "">("");
  const [nivel, setNivel] = useState<NivelAlerta | "">("");

  // Secuencia de peticiones: si dos consultas se solapan (ej. cambiar un filtro y
  // paginar casi a la vez), solo la última aplica su resultado y apaga el loading.
  // Evita que una respuesta lenta y vieja pise a una nueva (out-of-order).
  const fetchSeq = useRef(0);

  const runFetch = useCallback(async (page: number, filtros: FiltrosHistorialAlertas) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const result = await api.alertas.listPaged(page, PAGE_SIZE, buildAlertasServerParams(filtros));
      if (seq !== fetchSeq.current) return; // superada por una consulta más reciente
      setAlertas(result.content);
      setTotalElements(result.totalElements);
      setServerTotalPages(result.totalPages);
      setCurrentPage(result.number);
    } catch {
      // keep current data on error
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  // TODOS los filtros son de servidor: el total y totalPages de la respuesta se
  // calculan sobre el conjunto filtrado completo, así que el contador y la
  // paginación nunca pueden contradecir las filas de la tabla. (Antes nivel y
  // trabajadorSearch se filtraban client-side sobre la página actual y el pie
  // podía decir "N de 800" con la tabla vacía.)
  const serverFilters = useMemo<FiltrosHistorialAlertas>(
    () => ({ tipo, nivel, fechaDesde, fechaHasta, trabajadorSearch }),
    [tipo, nivel, fechaDesde, fechaHasta, trabajadorSearch]
  );
  const debouncedFilters = useDebouncedValue(serverFilters, FILTER_DEBOUNCE_MS);

  // Un cambio de filtro se está "asentando" (esperando su debounce) mientras el
  // snapshot debounced no coincide con los filtros vivos. Durante ese lapso la
  // paginación se deshabilita: está por resetear a la página 0, así que un clic
  // de página no debe disparar un fetch con filtros a medio cambiar (parpadeo).
  const filtersSettling = serverFilters !== debouncedFilters;

  // Auto-aplica los filtros al cambiarlos (sin botón "Buscar"). Se salta la
  // primera corrida porque `initialPage` ya viene del server sin filtros.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const { fechaDesde: fd, fechaHasta: fh } = debouncedFilters;
    // Rango inválido (desde >= hasta): espera a que sea coherente, sin errorar.
    if (fd && fh && new Date(fd) >= new Date(fh)) return;
    runFetch(0, debouncedFilters);
  }, [debouncedFilters, runFetch]);

  function handlePageChange(page: number) {
    // Usa los filtros vivos: al hacer clic, paginación está habilitada solo cuando
    // no hay cambios asentándose, por lo que serverFilters === debouncedFilters.
    runFetch(page, serverFilters);
  }

  function handleLimpiar() {
    setFechaDesde("");
    setFechaHasta("");
    setTrabajadorSearch("");
    setTipo("");
    setNivel("");
    // El efecto de auto-aplicado refetchea sin filtros de servidor si hacía falta.
  }

  // Aplica el filtro por tipo recibido vía query param `?tipo=` (contrato con el
  // dashboard). Solo setea el estado; el efecto de auto-aplicado hace el fetch.
  // Valores esperados: enum TipoAlerta en MAYÚSCULAS.
  const queryTipoApplied = useRef(false);
  useEffect(() => {
    if (queryTipoApplied.current) return;
    const raw = searchParams.get("tipo");
    if (!raw) return;
    const candidate = raw.toUpperCase() as TipoAlerta;
    if (!TIPOS.includes(candidate)) return;

    queryTipoApplied.current = true;
    setTipo(candidate);
    setFiltersOpen(true);
  }, [searchParams]);

  function handleLimpiarTipoChip() {
    setTipo("");
  }

  // Sin filtrado client-side: la página llega ya filtrada del servidor, la misma
  // consulta que calcula totalElements/totalPages.
  const pageData = alertas;
  const totalPages = serverTotalPages;

  function renderPagination() {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const maxButtons = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(0, endPage - maxButtons + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          {t("historialAlertas.showingResults", {
            from: currentPage * PAGE_SIZE + 1,
            to: Math.min((currentPage + 1) * PAGE_SIZE, totalElements),
            total: totalElements,
          })}
        </p>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage <= 0 || loading || filtersSettling}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            {t("common.previous")}
          </button>
          {pages.map((p) => (
            <button
              key={p}
              className={p === currentPage ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem", minWidth: "2rem" }}
              disabled={loading || filtersSettling}
              onClick={() => handlePageChange(p)}
            >
              {p + 1}
            </button>
          ))}
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage >= totalPages - 1 || loading || filtersSettling}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            {t("common.next")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="historial-header" style={{ marginBottom: "2rem" }}>
        <h1 className="historial-title" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
          {t("historialAlertas.title")}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {t("historialAlertas.subtitle")}
        </p>
      </div>

      {/* Chip de filtro activo por tipo (proveniente del query param `?tipo=`) */}
      {tipo && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Filtrado por tipo:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(249,115,22,0.12)",
              border: "1px solid var(--color-accent)",
              color: "var(--color-accent)",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {tipo}
            <button
              onClick={handleLimpiarTipoChip}
              aria-label="Quitar filtro de tipo"
              title="Quitar filtro de tipo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--color-accent)",
                lineHeight: 0,
              }}
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Filter section — collapsible */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "var(--color-text-primary)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t("historialAlertas.searchFilters")}</span>
          {filtersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {filtersOpen && (
          <div style={{ marginTop: "1rem" }}>
            <div className="historial-filtros-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
              {/* Fecha desde */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.from")}
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  style={{ width: "100%", cursor: "pointer" }}
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  onClick={abrirCalendario}
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.to")}
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  style={{ width: "100%", cursor: "pointer" }}
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  onClick={abrirCalendario}
                />
              </div>

              {/* Trabajador search */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.worker")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: "100%" }}
                  placeholder={t("historialAlertas.searchByNameOrRut")}
                  value={trabajadorSearch}
                  onChange={(e) => setTrabajadorSearch(e.target.value)}
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.alertType")}
                </label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoAlerta | "")}
                >
                  <option value="">{t("common.all")}</option>
                  {TIPOS.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
              </div>

              {/* Nivel */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.level")}
                </label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value as NivelAlerta | "")}
                >
                  <option value="">{t("common.all")}</option>
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Limpiar — en la misma fila que los filtros, alineado abajo a la derecha */}
              {(tipo || fechaDesde || fechaHasta || nivel || trabajadorSearch) && (
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn-secondary"
                    onClick={handleLimpiar}
                    style={{ display: "flex", alignItems: "center", gap: "0.375rem", whiteSpace: "nowrap" }}
                  >
                    <X size={15} />
                    {t("historialAlertas.clearFilters")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="historial-table-wrap" style={{ overflowX: "auto" }}>
          <table className="historial-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  { key: "timestamp", label: t("historialAlertas.colTimestamp"), align: "center" as const },
                  { key: "trabajador", label: t("historialAlertas.colWorker"), align: "left" as const },
                  { key: "tipo", label: t("historialAlertas.colType"), align: "center" as const },
                  { key: "nivel", label: t("historialAlertas.colLevel"), align: "center" as const },
                  { key: "valor", label: t("historialAlertas.colValor"), align: "center" as const },
                  { key: "descripcion", label: t("historialAlertas.colDescription"), align: "center" as const },
                ].map((h) => (
                  <th
                    key={h.key}
                    style={{
                      padding: "0.75rem 0.5rem",
                      textAlign: h.align,
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    {t("historialAlertas.noAlertsMatch")}
                  </td>
                </tr>
              ) : (
                pageData.map((a) => {
                  const nombre = a.trabajador
                    ? `${a.trabajador.nombre} ${a.trabajador.apellidoPaterno}`
                    : a.rutTrabajador;
                  const initials = getInitials(a.trabajador?.nombre, a.trabajador?.apellidoPaterno);

                  return (
                    <tr key={a.id} onClick={() => router.push(`/historial-alertas/${a.id}`)} style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer", transition: "background-color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                      {/* TIMESTAMP */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(a.timestamp).toLocaleString("es-CL")}
                      </td>

                      {/* TRABAJADOR — avatar + name + rut */}
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              backgroundColor: "var(--color-accent)",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-primary)", lineHeight: 1.2 }}>
                              {nombre}
                            </p>
                            <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", lineHeight: 1.2, marginTop: "0.125rem" }}>
                              {a.rutTrabajador}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* TIPO */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "var(--color-text-primary)" }}>
                        {a.tipo}
                      </td>

                      {/* NIVEL — badge */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <span className={nivelBadgeClass(a.nivel)}>
                          {a.nivel}
                        </span>
                      </td>

                      {/* VALOR */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                        {formatValorAlerta(a.tipo, a.valorMedido)}
                      </td>

                      {/* DESCRIPCION */}
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          textAlign: "left",
                          color: "var(--color-text-secondary)",
                          maxWidth: "300px",
                          wordBreak: "break-word",
                        }}
                      >
                        {a.descripcion || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .historial-filtros-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }
        }
        @media (max-width: 768px) {
          .historial-header {
            margin-bottom: 1.25rem !important;
          }
          .historial-title {
            font-size: 1.25rem !important;
          }
          .historial-filtros-grid {
            grid-template-columns: 1fr !important;
            gap: 0.625rem !important;
          }
          .historial-table-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .historial-table {
            min-width: 640px !important;
          }
        }
      `}</style>
    </div>
  );
}
