"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/api/client";
import { FilterStatus } from "@/types";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface Props {
  initialData: FilterStatus[];
}

export default function VidaUtilFiltrosClient({ initialData }: Props) {
  const [data, setData] = useState<FilterStatus[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("TODOS");

  // Polling every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await api.filterLifecycle.estado();
        setData(updated);
      } catch {
        // silently fail
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleRefresh() {
    setLoading(true);
    try {
      const updated = await api.filterLifecycle.estado();
      setData(updated);
    } catch (err) {
      console.error("Error al refrescar datos", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = data;
    if (filterLevel !== "TODOS") {
      result = result.filter((f) => f.nivelAlerta === filterLevel);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.trabajadorNombre.toLowerCase().includes(term) ||
          f.trabajadorRut.toLowerCase().includes(term) ||
          f.tipoFiltro.toLowerCase().includes(term)
      );
    }
    return result;
  }, [data, filterLevel, searchTerm]);

  const stats = useMemo(() => {
    const ok = data.filter((f) => f.nivelAlerta === "OK").length;
    const advertencia = data.filter((f) => f.nivelAlerta === "ADVERTENCIA").length;
    const critico = data.filter((f) => f.nivelAlerta === "CRITICO").length;
    const vencido = data.filter((f) => f.nivelAlerta === "VENCIDO").length;
    return { ok, advertencia, critico, vencido, total: data.length };
  }, [data]);

  function getProgressColor(porcentaje: number): string {
    if (porcentaje > 100) return "#ef4444"; // red
    if (porcentaje > 95) return "#ef4444"; // red
    if (porcentaje > 80) return "#f59e0b"; // amber
    if (porcentaje > 60) return "#eab308"; // yellow
    return "#22c55e"; // green
  }

  function getBadge(nivel: string): { text: string; color: string; bgColor: string } {
    switch (nivel) {
      case "OK":
        return { text: "OK", color: "#22c55e", bgColor: "rgba(34,197,94,0.15)" };
      case "ADVERTENCIA":
        return { text: "Cambio pronto", color: "#f59e0b", bgColor: "rgba(245,158,11,0.15)" };
      case "CRITICO":
        return { text: "Cambio urgente", color: "#ef4444", bgColor: "rgba(239,68,68,0.15)" };
      case "VENCIDO":
        return { text: "VENCIDO", color: "#ef4444", bgColor: "rgba(239,68,68,0.25)" };
      default:
        return { text: nivel, color: "#6b7280", bgColor: "rgba(107,114,128,0.15)" };
    }
  }

  function getNivelIcon(nivel: string) {
    switch (nivel) {
      case "OK":
        return <CheckCircle size={14} color="#22c55e" />;
      case "ADVERTENCIA":
        return <AlertTriangle size={14} color="#f59e0b" />;
      case "CRITICO":
        return <XCircle size={14} color="#ef4444" />;
      case "VENCIDO":
        return <XCircle size={14} color="#ef4444" />;
      default:
        return <Clock size={14} />;
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Vida Útil de Filtros</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Monitoreo del desgaste y vida útil de filtros por trabajador
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleRefresh}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#6b7280" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Total</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem" }}>{stats.total}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>OK</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#22c55e" }}>{stats.ok}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Advertencia</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#f59e0b" }}>{stats.advertencia}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Crítico / Vencido</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#ef4444" }}>{stats.critico + stats.vencido}</span>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          className="input-field"
          type="text"
          placeholder="Buscar por nombre, RUT o filtro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="input-field"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDO">Vencido</option>
          <option value="CRITICO">Crítico</option>
          <option value="ADVERTENCIA">Advertencia</option>
          <option value="OK">OK</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--color-text-secondary)",
          }}
        >
          {data.length === 0
            ? "No hay datos de filtros disponibles. Asegúrese de que existan trabajadores con jornadas y filtros asignados."
            : "No se encontraron resultados con los filtros aplicados."}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <th style={thStyle}>Trabajador</th>
                  <th style={thStyle}>RUT</th>
                  <th style={thStyle}>Filtro</th>
                  <th style={thStyle}>Uso</th>
                  <th style={thStyle}>Horas</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const badge = getBadge(item.nivelAlerta);
                  return (
                    <tr
                      key={item.trabajadorRut}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{item.trabajadorNombre}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          {item.trabajadorRut}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.85rem" }}>{item.tipoFiltro}</span>
                      </td>
                      <td style={{ ...tdStyle, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: "var(--color-bg-secondary)",
                              borderRadius: "4px",
                              overflow: "hidden",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(item.porcentajeUso, 100)}%`,
                                height: "100%",
                                backgroundColor: getProgressColor(item.porcentajeUso),
                                borderRadius: "4px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: getProgressColor(item.porcentajeUso),
                              minWidth: 40,
                              textAlign: "right",
                            }}
                          >
                            {item.porcentajeUso.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          {item.horasUsadas.toFixed(1)} / {item.horasMaximas.toFixed(0)} hrs
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.25rem 0.625rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: badge.color,
                            backgroundColor: badge.bgColor,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getNivelIcon(item.nivelAlerta)}
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.875rem",
};
