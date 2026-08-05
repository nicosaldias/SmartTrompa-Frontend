"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { api } from "@/api/client";
import { FilterStatus } from "@/types";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Wrench } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import LeyendaSemaforo from "@/components/LeyendaSemaforo";
import { API_BASE_URL } from "@/api/endpoints";
import DesgloseFiltroModal from "./DesgloseFiltroModal";
import { useRealtime } from "@/realtime/RealtimeProvider";
import type { AlertaEventMsg } from "@/realtime/events";

function getInitials(nombreCompleto: string): string {
  const parts = nombreCompleto.trim().split(/\s+/);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts[1]?.charAt(0) ?? "";
  return `${a}${b}`.toUpperCase();
}

interface Props {
  initialData: FilterStatus[];
  isAdmin: boolean;
}

export default function VidaUtilFiltrosClient({ initialData, isAdmin }: Props) {
  const t = useT();
  const [data, setData] = useState<FilterStatus[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("TODOS");
  const [selectedRut, setSelectedRut] = useState<string | null>(null);

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

  // En vivo: el job horario del backend emite las alertas de FILTRO al crearlas.
  useRealtime<AlertaEventMsg>("alertas", (e) => {
    // FILTRO_VIDA_UTIL: alertas del job horario de desgaste (las de esta vista);
    // FILTRO: saturación del sensor — se mantiene por si cambia el % de uso mostrado.
    if (e?.tipoAlerta !== "FILTRO" && e?.tipoAlerta !== "FILTRO_VIDA_UTIL") return;
    api.filterLifecycle.estado().then(setData).catch(() => {});
  });

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await api.filterLifecycle.estado();
      setData(updated);
    } catch (err) {
      console.error("Error al refrescar datos", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => setSelectedRut(null), []);

  // Cierra el ciclo detección→acción: la vista que muestra el VENCIDO ofrece
  // registrar el cambio físico. El backend reinicia el acumulado de horas y
  // resuelve la alerta de vida útil activa.
  const registrarCambio = useCallback(async (item: FilterStatus) => {
    // datetime-local en hora local del navegador; max = ahora (el backend re-valida)
    const ahoraLocal = (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    })();
    const inputStyle =
      "width:100%;padding:0.5rem;border-radius:6px;border:1px solid var(--color-border);" +
      "background:var(--color-bg-secondary);color:var(--color-text-primary);";
    const { value, isConfirmed } = await Swal.fire<{ fecha: string; notas: string }>({
      title: t("vidaUtilFiltros.confirmCambioTitle"),
      html:
        `<p style="margin-bottom:0.75rem">${t("vidaUtilFiltros.confirmCambioText", { nombre: item.trabajadorNombre })}</p>` +
        `<label style="display:block;text-align:left;font-size:0.8rem;margin-bottom:0.25rem">${t("vidaUtilFiltros.fechaCambioLabel")}</label>` +
        `<input id="swal-fecha-cambio" type="datetime-local" value="${ahoraLocal}" max="${ahoraLocal}" style="${inputStyle}margin-bottom:0.75rem" />` +
        `<input id="swal-notas-cambio" type="text" placeholder="${t("vidaUtilFiltros.notasPlaceholder")}" style="${inputStyle}" />`,
      preConfirm: () => ({
        fecha: (document.getElementById("swal-fecha-cambio") as HTMLInputElement)?.value ?? "",
        notas: (document.getElementById("swal-notas-cambio") as HTMLInputElement)?.value ?? "",
      }),
      showCancelButton: true,
      confirmButtonText: t("vidaUtilFiltros.registrarCambio"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
    });
    if (!isConfirmed) return;
    try {
      await api.filterLifecycle.registrarCambio(item.trabajadorRut, value?.notas ?? "", value?.fecha || undefined);
      await handleRefresh();
      Swal.fire({
        icon: "success", title: t("vidaUtilFiltros.cambioOk"),
        timer: 1600, showConfirmButton: false,
        background: "var(--color-bg-card)", color: "var(--color-text-primary)",
      });
    } catch {
      Swal.fire({
        icon: "error", title: t("common.error"), text: t("vidaUtilFiltros.cambioError"),
        background: "var(--color-bg-card)", color: "var(--color-text-primary)",
      });
    }
  }, [t, handleRefresh]);

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
        return { text: t("vidaUtilFiltros.badgeOk"), color: "#22c55e", bgColor: "rgba(34,197,94,0.15)" };
      case "ADVERTENCIA":
        return { text: t("vidaUtilFiltros.badgeChangeSoon"), color: "#f59e0b", bgColor: "rgba(245,158,11,0.15)" };
      case "CRITICO":
        return { text: t("vidaUtilFiltros.badgeChangeUrgent"), color: "#ef4444", bgColor: "rgba(239,68,68,0.15)" };
      case "VENCIDO":
        return { text: t("vidaUtilFiltros.badgeExpired"), color: "#ef4444", bgColor: "rgba(239,68,68,0.25)" };
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
    <div className="vida-util-root">
      {/* Header */}
      <div
        className="vida-util-header"
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
          <h1 className="vida-util-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("vidaUtilFiltros.title")}</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {t("vidaUtilFiltros.subtitle")}
          </p>
          <div style={{ marginTop: "0.5rem" }}>
            <LeyendaSemaforo />
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleRefresh}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {t("common.update")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="vida-util-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#6b7280" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{t("vidaUtilFiltros.statTotal")}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem" }}>{stats.total}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{t("vidaUtilFiltros.statOk")}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#22c55e" }}>{stats.ok}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{t("vidaUtilFiltros.statWarning")}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#f59e0b" }}>{stats.advertencia}</span>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{t("vidaUtilFiltros.statCriticalExpired")}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#ef4444" }}>{stats.critico + stats.vencido}</span>
        </div>
      </div>

      {/* Filters row */}
      <div className="vida-util-filters" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          className="input-field vida-util-search"
          type="text"
          placeholder={t("vidaUtilFiltros.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="input-field vida-util-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="TODOS">{t("vidaUtilFiltros.filterAllStatuses")}</option>
          <option value="VENCIDO">{t("vidaUtilFiltros.filterExpired")}</option>
          <option value="CRITICO">{t("vidaUtilFiltros.filterCritical")}</option>
          <option value="ADVERTENCIA">{t("vidaUtilFiltros.filterWarning")}</option>
          <option value="OK">{t("vidaUtilFiltros.filterOk")}</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
            {data.length === 0 ? t("vidaUtilFiltros.noDataTitle") : t("vidaUtilFiltros.noResultsTitle")}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {data.length === 0
              ? t("vidaUtilFiltros.noDataHint")
              : t("vidaUtilFiltros.noResultsHint")}
          </p>
        </div>
      ) : (
        <div className="card vida-util-table-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="vida-util-table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <th style={thStyleLeft}>{t("roles.worker")}</th>
                  <th style={thStyle}>{t("common.rut")}</th>
                  <th style={thStyle}>{t("vidaUtilFiltros.colFilter")}</th>
                  <th style={thStyle}>{t("vidaUtilFiltros.colUsage")}</th>
                  <th style={thStyle}>{t("vidaUtilFiltros.colHours")}</th>
                  <th style={thStyle}>{t("common.status")}</th>
                  <th style={thStyle}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const badge = getBadge(item.nivelAlerta);
                  return (
                    <tr
                      key={item.trabajadorRut}
                      onClick={() => setSelectedRut(item.trabajadorRut)}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background-color 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={tdStyleLeft}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          {item.tieneImagen ? (
                            <img
                              src={`${API_BASE_URL}/trabajador/${item.trabajadorRut}/imagen/`}
                              alt=""
                              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #f97316, #ea580c)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                // Sobre este gradiente el blanco daba 2.80:1 en el extremo
                                // #f97316 y 3.56:1 en el #ea580c; --color-on-accent sube a
                                // 5.91:1 y 4.65:1. El par no depende del tema porque el
                                // gradiente es el mismo en claro y en oscuro.
                                color: "var(--color-on-accent)",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(item.trabajadorNombre)}
                            </div>
                          )}
                          <span style={{ fontWeight: 600 }}>{item.trabajadorNombre}</span>
                        </div>
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
                          {/* Barra segmentada: sobre 100 % la porción rayada es el EXCESO.
                              El clamp a 100 % dejaba 7 filtros al 155-870 % viéndose idénticos. */}
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: "var(--color-bg-secondary)",
                              borderRadius: "4px",
                              overflow: "hidden",
                              border: "1px solid var(--color-border)",
                              display: "flex",
                            }}
                          >
                            {item.porcentajeUso > 100 ? (
                              <>
                                <div style={{
                                  width: `${(100 / item.porcentajeUso) * 100}%`,
                                  height: "100%",
                                  backgroundColor: "#f59e0b",
                                }} />
                                <div style={{
                                  width: `${((item.porcentajeUso - 100) / item.porcentajeUso) * 100}%`,
                                  height: "100%",
                                  background: "repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #7f1d1d 4px, #7f1d1d 8px)",
                                }} />
                              </>
                            ) : (
                              <div
                                style={{
                                  width: `${item.porcentajeUso}%`,
                                  height: "100%",
                                  backgroundColor: getProgressColor(item.porcentajeUso),
                                  borderRadius: "4px",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            )}
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
                          {item.horasUsadas.toFixed(1)} / {item.horasMaximas.toFixed(0)} {t("vidaUtilFiltros.hoursUnit")}
                        </span>
                        {item.horasUsadas > item.horasMaximas && (
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ef4444", marginTop: "0.125rem" }}>
                            +{(item.horasUsadas - item.horasMaximas).toFixed(1)} {t("vidaUtilFiltros.hoursUnit")} {t("vidaUtilFiltros.excessLabel")}
                          </div>
                        )}
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
                      <td style={tdStyle}>
                        <button
                          onClick={(e) => { e.stopPropagation(); registrarCambio(item); }}
                          className="btn-secondary"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.375rem",
                            fontSize: "0.7rem", padding: "0.375rem 0.625rem", whiteSpace: "nowrap",
                          }}
                          title={t("vidaUtilFiltros.registrarCambio")}
                        >
                          <Wrench size={12} />
                          {t("vidaUtilFiltros.registrarCambio")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRut && (
        <DesgloseFiltroModal
          rut={selectedRut}
          isAdmin={isAdmin}
          onClose={handleCloseModal}
          onChanged={handleRefresh}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .vida-util-title { font-size: 1.2rem !important; }
          .vida-util-header { margin-bottom: 1.25rem !important; }
          .vida-util-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
          .vida-util-select { width: 100% !important; }
          .vida-util-table-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .vida-util-table-wrap table { min-width: 720px !important; }
        }
        @media (max-width: 480px) {
          .vida-util-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 0.5rem",
  textAlign: "center",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const thStyleLeft: React.CSSProperties = {
  ...thStyle,
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 0.5rem",
  textAlign: "center",
  fontSize: "0.875rem",
};

const tdStyleLeft: React.CSSProperties = {
  ...tdStyle,
  textAlign: "left",
};
