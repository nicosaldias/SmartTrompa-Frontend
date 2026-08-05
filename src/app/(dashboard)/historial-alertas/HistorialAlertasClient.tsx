"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api, { ApiError } from "@/api/client";
import type { AlertaHistorial, TipoAlerta, NivelAlerta, PageResponse } from "@/types";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronRight, X, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import { abrirCalendario } from "@/utils/datePicker";
import { formatValorAlerta } from "@/utils/sensorMappings";
import { formatFechaHora } from "@/utils/fechas";
import {
  buildAlertasServerParams,
  buildEliminarPorFiltroBody,
  type EstadoAlertaFiltro,
  type FiltrosHistorialAlertas,
} from "@/utils/alertasQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRealtime } from "@/realtime/RealtimeProvider";
import { getUserFromCookie } from "@/utils/cookies";
import PageSizeSelect from "@/components/PageSizeSelect";

interface Props {
  initialPage: PageResponse<AlertaHistorial>;
}

const TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "FILTRO_VIDA_UTIL", "BATERIA", "DESCONEXION"];
const NIVELES: NivelAlerta[] = ["OK", "ALERTA", "CRITICO"];
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZES = [20, 50, 100, 200];
const PAGE_SIZE_STORAGE_KEY = "historialAlertas.pageSize";
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Filter state
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [trabajadorSearch, setTrabajadorSearch] = useState("");
  const [tipo, setTipo] = useState<TipoAlerta | "">("");
  const [nivel, setNivel] = useState<NivelAlerta | "">("");
  const [estado, setEstado] = useState<EstadoAlertaFiltro>("");

  // Selección para eliminación masiva — solo Administrador (el DELETE del
  // backend es Admin-only; a un Supervisor la columna ni se le muestra).
  const [isAdmin, setIsAdmin] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  // true = "todas las N que cumplen el filtro" (más allá de la página visible).
  const [seleccionTodoFiltro, setSeleccionTodoFiltro] = useState(false);
  useEffect(() => {
    setIsAdmin(getUserFromCookie()?.cargo === "Administrador");
  }, []);

  // Secuencia de peticiones: si dos consultas se solapan (ej. cambiar un filtro y
  // paginar casi a la vez), solo la última aplica su resultado y apaga el loading.
  // Evita que una respuesta lenta y vieja pise a una nueva (out-of-order).
  const fetchSeq = useRef(0);

  const runFetch = useCallback(async (page: number, filtros: FiltrosHistorialAlertas, size: number) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const result = await api.alertas.listPaged(page, size, buildAlertasServerParams(filtros));
      if (seq !== fetchSeq.current) return; // superada por una consulta más reciente
      setAlertas(result.content);
      setTotalElements(result.totalElements);
      setServerTotalPages(result.totalPages);
      setCurrentPage(result.number);
      // La selección referencia filas que pueden haber salido del conjunto.
      setSeleccion(new Set());
      setSeleccionTodoFiltro(false);
    } catch {
      // keep current data on error
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  // Tamaño de página: se hidrata de localStorage tras montar (SSR-safe) y cada
  // cambio persiste y refetchea desde la página 0.
  const pageSizeHydrated = useRef(false);
  useEffect(() => {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    pageSizeHydrated.current = true;
    if (PAGE_SIZES.includes(stored) && stored !== PAGE_SIZE_DEFAULT) {
      setPageSize(stored);
    }
  }, []);
  const pageSizeFirstRun = useRef(true);
  useEffect(() => {
    if (pageSizeFirstRun.current) {
      pageSizeFirstRun.current = false;
      return;
    }
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    runFetch(0, serverFiltersRef.current, pageSize);
  }, [pageSize, runFetch]);

  // TODOS los filtros son de servidor: el total y totalPages de la respuesta se
  // calculan sobre el conjunto filtrado completo, así que el contador y la
  // paginación nunca pueden contradecir las filas de la tabla. (Antes nivel y
  // trabajadorSearch se filtraban client-side sobre la página actual y el pie
  // podía decir "N de 800" con la tabla vacía.)
  const serverFilters = useMemo<FiltrosHistorialAlertas>(
    () => ({ tipo, nivel, fechaDesde, fechaHasta, trabajadorSearch, estado }),
    [tipo, nivel, fechaDesde, fechaHasta, trabajadorSearch, estado]
  );
  // Ref espejo para efectos que necesitan los filtros vigentes sin re-disparse
  // al cambiar estos (ej. el refetch por cambio de tamaño de página).
  const serverFiltersRef = useRef(serverFilters);
  useEffect(() => { serverFiltersRef.current = serverFilters; }, [serverFilters]);
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
    runFetch(0, debouncedFilters, pageSize);
    // pageSize NO va en deps: su cambio ya refetchea en su propio efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, runFetch]);

  // En vivo: una alerta nueva o resuelta refresca la página vigente con los
  // filtros vigentes; fetchSeq ya descarta respuestas fuera de orden.
  useRealtime("alertas", () => {
    if (!filtersSettling) runFetch(currentPage, debouncedFilters, pageSize);
  });

  function handlePageChange(page: number) {
    // Usa los filtros vivos: al hacer clic, paginación está habilitada solo cuando
    // no hay cambios asentándose, por lo que serverFilters === debouncedFilters.
    runFetch(page, serverFilters, pageSize);
  }

  function handleLimpiar() {
    setFechaDesde("");
    setFechaHasta("");
    setTrabajadorSearch("");
    setTipo("");
    setNivel("");
    setEstado("");
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

  // ---- Selección múltiple y eliminación masiva (solo Admin) ----

  const paginaCompletaSeleccionada = alertas.length > 0 && alertas.every((a) => seleccion.has(a.id));
  const totalSeleccionadas = seleccionTodoFiltro ? totalElements : seleccion.size;

  function toggleFila(id: number, checked: boolean) {
    setSeleccionTodoFiltro(false);
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePagina(checked: boolean) {
    setSeleccionTodoFiltro(false);
    setSeleccion(checked ? new Set(alertas.map((a) => a.id)) : new Set());
  }

  const swalTheme = { background: "var(--color-bg-card)", color: "var(--color-text-primary)" };

  async function handleEliminarSeleccion() {
    const esTodoFiltro = seleccionTodoFiltro;
    const conteo = totalSeleccionadas;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: t("historialAlertas.deleteConfirmTitle"),
      text: esTodoFiltro
        ? t("historialAlertas.deleteConfirmFilterText", { count: String(conteo) })
        : t("historialAlertas.deleteConfirmText", { count: String(conteo) }),
      showCancelButton: true,
      confirmButtonText: t("historialAlertas.deleteConfirmButton"),
      cancelButtonText: t("common.cancel"),
      confirmButtonColor: "#ef4444",
      ...swalTheme,
    });
    if (!isConfirmed) return;
    try {
      const result = esTodoFiltro
        ? await api.alertas.eliminarPorFiltro(buildEliminarPorFiltroBody(serverFilters, totalElements))
        : await api.alertas.eliminarLote([...seleccion]);
      await runFetch(0, serverFilters, pageSize);
      Swal.fire({
        icon: "success",
        title: t("historialAlertas.deleteOk", { count: String(result.eliminadas) }),
        timer: 1800, showConfirmButton: false, ...swalTheme,
      });
    } catch (err) {
      // El 409 del backend significa: el conjunto cambió entre el conteo y el
      // confirm (p. ej. el job creó alertas nuevas) — refrescar y reintentar.
      const conflicto = err instanceof ApiError && err.status === 409;
      await runFetch(0, serverFilters, pageSize);
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: conflicto ? t("historialAlertas.deleteConflict") : t("historialAlertas.deleteError"),
        ...swalTheme,
      });
    }
  }

  // Sin filtrado client-side: la página llega ya filtrada del servidor, la misma
  // consulta que calcula totalElements/totalPages.
  const pageData = alertas;
  const totalPages = serverTotalPages;

  function renderPagination() {
    // Con una sola página igual se muestra la barra: el selector de tamaño
    // debe estar disponible siempre (es el control que crea/quita páginas).
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            {totalElements > 0 && (
              <>
                {t("historialAlertas.showingResults", {
                  from: currentPage * pageSize + 1,
                  to: Math.min((currentPage + 1) * pageSize, totalElements),
                  total: totalElements,
                })}
                {" · "}
                {t("historialAlertas.pageOf", { page: currentPage + 1, total: totalPages })}
              </>
            )}
          </p>
          <PageSizeSelect
            value={pageSize}
            options={PAGE_SIZES}
            onChange={setPageSize}
            disabled={loading || filtersSettling}
          />
        </div>
        {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage <= 0 || loading || filtersSettling}
            onClick={() => handlePageChange(0)}
            title={t("historialAlertas.firstPage")}
          >
            «
          </button>
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
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage >= totalPages - 1 || loading || filtersSettling}
            onClick={() => handlePageChange(totalPages - 1)}
            title={t("historialAlertas.lastPage")}
          >
            »
          </button>
        </div>
        )}
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
              // Caso borde: naranja sobre naranja tenue, y exactamente la misma
              // construcción que .sidebar-link.active (tinta de --color-accent al
              // --accent-tint del tema + texto y borde en --color-accent-text), así que
              // usa los mismos tokens y da las mismas cifras.
              // El relleno era rgba(249,115,22,0.12) a mano y el borde --color-accent.
              // Ese 12 % se midió contra .card blanco (#feeee3 → 4.58:1), pero el chip
              // NO vive en una .card: cuelga suelto de la cabecera, sobre
              // --color-bg-primary (#f4f6f9 en claro), y allí resolvía a #f6ece5 y la
              // tinta caía a 4.26:1 — bajo el 4.5:1 de AA. Con --accent-tint (6 % en
              // claro, 15 % en oscuro) el peor caso real sube a 4.51:1 sobre la página
              // clara y 4.55:1 sobre .card oscura (5.57:1 sobre la página oscura,
              // 4.89:1 sobre .card clara).
              // El borde pasa a --color-accent-text por el mismo motivo que el
              // border-left del sidebar y el borde de .btn-secondary:hover: como
              // componente de interfaz le toca 3:1 y el naranja de marca daba 2.59:1
              // sobre la página clara. Con el token, 4.78:1 (6.75:1 en oscuro).
              backgroundColor: "color-mix(in srgb, var(--color-accent) var(--accent-tint), transparent)",
              border: "1px solid var(--color-accent-text)",
              color: "var(--color-accent-text)",
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
                // Misma tinta que el chip que lo contiene: la X de 14px es el control para
                // quitar el filtro y a 2.48:1 se perdía dentro del relleno naranja.
                color: "var(--color-accent-text)",
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

              {/* Estado: activas (lo abierto), resueltas (purga masiva) o todas */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  {t("historialAlertas.estadoFilter")}
                </label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoAlertaFiltro)}
                >
                  <option value="">{t("common.all")}</option>
                  <option value="activas">{t("historialAlertas.soloActivas")}</option>
                  <option value="resueltas">{t("historialAlertas.soloResueltas")}</option>
                </select>
              </div>

              {/* Limpiar — en la misma fila que los filtros, alineado abajo a la derecha */}
              {(tipo || fechaDesde || fechaHasta || nivel || trabajadorSearch || estado) && (
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

      {/* Barra de selección (solo Admin, con filas marcadas) */}
      {isAdmin && totalSeleccionadas > 0 && (
        <div className="card" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", borderColor: "var(--color-accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {seleccionTodoFiltro
                ? t("historialAlertas.selectedAllFilter", { count: String(totalElements) })
                : t("historialAlertas.selectedCount", { count: String(seleccion.size) })}
            </span>
            {/* Patrón Gmail: página completa marcada → ofrecer el conjunto entero
                del filtro. Solo con algún filtro activo (el backend exige criterio). */}
            {!seleccionTodoFiltro && paginaCompletaSeleccionada && totalElements > alertas.length
              && Object.keys(buildAlertasServerParams(serverFilters)).length > 0 && (
              <button
                onClick={() => setSeleccionTodoFiltro(true)}
                style={{ background: "none", border: "none", color: "var(--color-accent-text)", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline", padding: 0 }}
              >
                {t("historialAlertas.selectAllFilter", { count: String(totalElements) })}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-secondary"
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => { setSeleccion(new Set()); setSeleccionTodoFiltro(false); }}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleEliminarSeleccion}
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", fontSize: "0.8rem", fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", backgroundColor: "#ef4444", color: "#fff" }}
            >
              <Trash2 size={14} />
              {t("historialAlertas.deleteSelected")}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="historial-table-wrap" style={{ overflowX: "auto" }}>
          <table className="historial-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {isAdmin && (
                  <th style={{ padding: "0.75rem 0.5rem", width: 34, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      aria-label={t("historialAlertas.selectPage")}
                      checked={paginaCompletaSeleccionada}
                      onChange={(e) => togglePagina(e.target.checked)}
                      style={{ accentColor: "var(--color-accent)", width: 15, height: 15, cursor: "pointer" }}
                    />
                  </th>
                )}
                {[
                  { key: "timestamp", label: t("historialAlertas.colTimestamp"), align: "center" as const },
                  { key: "trabajador", label: t("historialAlertas.colWorker"), align: "left" as const },
                  { key: "tipo", label: t("historialAlertas.colType"), align: "center" as const },
                  { key: "nivel", label: t("historialAlertas.colLevel"), align: "center" as const },
                  { key: "valor", label: t("historialAlertas.colValor"), align: "center" as const },
                  { key: "descripcion", label: t("historialAlertas.colDescription"), align: "center" as const },
                  { key: "detalle", label: "", align: "center" as const },
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
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
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
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/historial-alertas/${a.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/historial-alertas/${a.id}`);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`${t("historialAlertas.viewDetail")}: ${a.tipo} ${nombre ?? ""}`}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer", transition: "background-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* CHECKBOX de selección (solo Admin) — la celda entera frena
                          la navegación de la fila para que marcar no abra el detalle */}
                      {isAdmin && (
                        <td
                          style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`${t("historialAlertas.selectRow")} #${a.id}`}
                            checked={seleccionTodoFiltro || seleccion.has(a.id)}
                            onChange={(e) => toggleFila(a.id, e.target.checked)}
                            style={{ accentColor: "var(--color-accent)", width: 15, height: 15, cursor: "pointer" }}
                          />
                        </td>
                      )}

                      {/* TIMESTAMP */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {formatFechaHora(a.timestamp)}
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
                              // Iniciales sobre relleno naranja plano: con #fff daban
                              // 2.80:1 en ambos temas (el relleno es #f97316 en los dos),
                              // con --color-on-accent 5.91:1. El botón rojo de la línea
                              // 597 conserva su #fff: sobre #ef4444 rinde 3.76:1 y
                              // oscurecerlo no aporta.
                              color: "var(--color-on-accent)",
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

                      {/* DETALLE — link real: visible, abre en pestaña nueva con ctrl+clic
                          y navegable por teclado (la fila clickeable sola era indetectable). */}
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <Link
                          href={`/historial-alertas/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          title={t("historialAlertas.viewDetail")}
                          aria-label={t("historialAlertas.viewDetail")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            // Chevron de 16px sin texto acompañante: es el único affordance
                            // de "ver detalle" de la fila. Sobre .card blanco el acento puro
                            // daba 2.80:1, bajo el 3:1 de AA para componentes; ahora 5.18:1.
                            color: "var(--color-accent-text)",
                          }}
                        >
                          <ChevronRight size={16} />
                        </Link>
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
