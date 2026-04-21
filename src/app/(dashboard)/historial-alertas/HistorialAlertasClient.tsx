"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/api/client";
import Swal from "sweetalert2";
import type { AlertaHistorial, TipoAlerta, NivelAlerta, PageResponse } from "@/types";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";

interface Props {
  initialPage: PageResponse<AlertaHistorial>;
}

const TIPOS: TipoAlerta[] = ["RESPIRATORIA", "AJUSTE", "FILTRO", "BATERIA", "DESCONEXION"];
const NIVELES: NivelAlerta[] = ["OK", "ALERTA", "CRITICO"];
const PAGE_SIZE = 20;

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
  const router = useRouter();
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

  async function fetchPage(page: number, params?: Record<string, string>) {
    setLoading(true);
    try {
      const serverParams: Record<string, string> = { ...params };
      if (tipo) serverParams.tipo = tipo;
      if (fechaDesde) serverParams.inicio = new Date(fechaDesde).toISOString();
      if (fechaHasta) serverParams.fin = new Date(fechaHasta).toISOString();

      const result = await api.alertas.listPaged(page, PAGE_SIZE, serverParams);
      setAlertas(result.content);
      setTotalElements(result.totalElements);
      setServerTotalPages(result.totalPages);
      setCurrentPage(result.number);
    } catch {
      // keep current data on error
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscar() {
    if (fechaDesde && fechaHasta && new Date(fechaDesde) >= new Date(fechaHasta)) {
      Swal.fire({
        icon: "error",
        title: "Rango de fechas inválido",
        text: "La fecha de inicio debe ser anterior a la fecha de fin",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }
    await fetchPage(0);
  }

  function handleLimpiar() {
    setFechaDesde("");
    setFechaHasta("");
    setTrabajadorSearch("");
    setTipo("");
    setNivel("");
    setCurrentPage(0);
    // Re-fetch unfiltered from first page
    setLoading(true);
    api.alertas.listPaged(0, PAGE_SIZE, {})
      .then((result) => {
        setAlertas(result.content);
        setTotalElements(result.totalElements);
        setServerTotalPages(result.totalPages);
        setCurrentPage(result.number);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handlePageChange(page: number) {
    fetchPage(page);
  }

  // Client-side filtering for text search and nivel (nivel is not a server param)
  const filteredAlertas = useMemo(() => {
    let result = alertas;

    // Filter by nivel (client-side)
    if (nivel) {
      result = result.filter((a) => a.nivel === nivel);
    }

    // Filter by trabajador text search (client-side)
    if (trabajadorSearch.trim()) {
      const q = trabajadorSearch.trim().toLowerCase();
      result = result.filter((a) => {
        const nombre = a.trabajador
          ? `${a.trabajador.nombre} ${a.trabajador.apellidoPaterno} ${a.trabajador.apellidoMaterno}`.toLowerCase()
          : "";
        const rut = a.rutTrabajador.toLowerCase();
        return nombre.includes(q) || rut.includes(q);
      });
    }

    return result;
  }, [alertas, nivel, trabajadorSearch]);

  // Pagination
  const pageData = filteredAlertas;
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
          Mostrando {currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} de {totalElements} resultados
        </p>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage <= 0}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Anterior
          </button>
          {pages.map((p) => (
            <button
              key={p}
              className={p === currentPage ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem", minWidth: "2rem" }}
              onClick={() => handlePageChange(p)}
            >
              {p + 1}
            </button>
          ))}
          <button
            className="btn-secondary"
            style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
            disabled={currentPage >= totalPages - 1}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
          Historial de Alertas
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Busca y filtra el historial de alertas del sistema
        </p>
      </div>

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
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Filtros de búsqueda</span>
          {filtersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {filtersOpen && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
              {/* Fecha desde */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Desde
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  style={{ width: "100%" }}
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Hasta
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  style={{ width: "100%" }}
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>

              {/* Trabajador search */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Trabajador
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: "100%" }}
                  placeholder="Buscar por nombre o RUT"
                  value={trabajadorSearch}
                  onChange={(e) => setTrabajadorSearch(e.target.value)}
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Tipo de alerta
                </label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoAlerta | "")}
                >
                  <option value="">Todos</option>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Nivel */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Nivel
                </label>
                <select
                  className="input-field"
                  style={{ width: "100%" }}
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value as NivelAlerta | "")}
                >
                  <option value="">Todos</option>
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button
                className="btn-secondary"
                onClick={handleLimpiar}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
              >
                <X size={15} />
                Limpiar filtros
              </button>
              <button
                className="btn-primary"
                onClick={handleBuscar}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
              >
                <Search size={15} />
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Timestamp", "Trabajador", "Tipo", "Nivel", "Descripción"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 0.5rem",
                      textAlign: h === "Trabajador" ? "left" : "center",
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Cargando...
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Sin alertas que coincidan con los filtros
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
    </div>
  );
}
