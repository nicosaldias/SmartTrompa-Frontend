"use client";

import { useState } from "react";
import { api } from "@/api/client";
import { FileText, Download, Calendar, AlertTriangle, Filter } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  alertasActivasCount: number;
  filtrosProximosCount: number;
}

type ReportTab = "semanal" | "mensual";

export default function ReportesClient({ alertasActivasCount, filtrosProximosCount }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>("semanal");
  const [loading, setLoading] = useState(false);

  // Weekly
  const today = new Date();
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 7);
  const [desde, setDesde] = useState(formatDateForInput(lastWeekStart));
  const [hasta, setHasta] = useState(formatDateForInput(today));

  // Monthly
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  function formatDateForInput(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  async function handleDescargarSemanal() {
    if (!desde || !hasta) {
      Swal.fire({
        icon: "warning",
        title: "Fechas requeridas",
        text: "Seleccione fecha desde y hasta",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }
    setLoading(true);
    try {
      const blob = await api.reportes.descargarSemanal(desde, hasta);
      downloadBlob(blob, `reporte_semanal_${desde}_${hasta}.pdf`);
      Swal.fire({
        icon: "success",
        title: "Reporte generado",
        text: "El PDF se descargó correctamente",
        timer: 2000,
        showConfirmButton: false,
        background: "#1c2333",
        color: "#e6edf3",
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message || "No se pudo generar el reporte",
        background: "#1c2333",
        color: "#e6edf3",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDescargarMensual() {
    setLoading(true);
    try {
      const blob = await api.reportes.descargarMensual(selectedYear, selectedMonth);
      const meses = [
        "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ];
      downloadBlob(blob, `reporte_mensual_${meses[selectedMonth]}_${selectedYear}.pdf`);
      Swal.fire({
        icon: "success",
        title: "Reporte generado",
        text: "El PDF se descargó correctamente",
        timer: 2000,
        showConfirmButton: false,
        background: "#1c2333",
        color: "#e6edf3",
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message || "No se pudo generar el reporte",
        background: "#1c2333",
        color: "#e6edf3",
      });
    } finally {
      setLoading(false);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Reportes de Seguridad</h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
          }}
        >
          Genera reportes PDF de seguridad industrial para gerencia
        </p>
      </div>

      {/* Preview stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "0.5rem",
              backgroundColor: "rgba(245,158,11,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} color="#f59e0b" />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Alertas activas
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{alertasActivasCount}</p>
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "0.5rem",
              backgroundColor: "rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Filter size={22} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Filtros por vencer
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{filtrosProximosCount}</p>
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "0.5rem",
              backgroundColor: "rgba(249,115,22,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={22} color="#f97316" />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Tipo de reporte
            </p>
            <p style={{ fontSize: "1rem", fontWeight: 600 }}>
              {activeTab === "semanal" ? "Semanal" : "Mensual"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: "1.5rem",
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "0.5rem",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        {(["semanal", "mensual"] as ReportTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              backgroundColor:
                activeTab === tab ? "var(--color-accent)" : "transparent",
              color: activeTab === tab ? "white" : "var(--color-text-secondary)",
              transition: "all 0.15s",
              textTransform: "uppercase",
              letterSpacing: "0.025em",
            }}
          >
            {tab === "semanal" ? "Reporte Semanal" : "Reporte Mensual"}
          </button>
        ))}
      </div>

      {/* Report form card */}
      <div className="card" style={{ maxWidth: 600 }}>
        {activeTab === "semanal" ? (
          <>
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1rem" }}>
              Reporte Semanal
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}
            >
              Selecciona el rango de fechas para generar el reporte semanal de seguridad.
              Incluye resumen de jornadas, alertas por tipo, estado de filtros y
              recomendaciones.
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  <Calendar size={14} />
                  Desde
                </label>
                <input
                  className="input-field"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  <Calendar size={14} />
                  Hasta
                </label>
                <input
                  className="input-field"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={handleDescargarSemanal}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "center",
                padding: "0.75rem",
              }}
            >
              <Download size={18} />
              {loading ? "Generando reporte..." : "Generar Reporte Semanal"}
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1rem" }}>
              Reporte Mensual
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}
            >
              Selecciona el mes y año para generar el reporte mensual de seguridad.
              Incluye resumen general, desglose de alertas, estado de filtros y
              observaciones con recomendaciones.
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Mes
                </label>
                <select
                  className="input-field"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ width: "100%" }}
                >
                  {mesesNombres.map((nombre, idx) => (
                    <option key={idx} value={idx + 1}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Año
                </label>
                <select
                  className="input-field"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ width: "100%" }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={handleDescargarMensual}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "center",
                padding: "0.75rem",
              }}
            >
              <Download size={18} />
              {loading ? "Generando reporte..." : "Generar Reporte Mensual"}
            </button>
          </>
        )}
      </div>

      {/* Info section */}
      <div
        className="card"
        style={{
          marginTop: "1.5rem",
          maxWidth: 600,
          borderLeft: "3px solid var(--color-accent)",
        }}
      >
        <h3 style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" }}>
          Contenido del reporte
        </h3>
        <ul
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.8,
            paddingLeft: "1.25rem",
            margin: 0,
          }}
        >
          <li>Resumen general: jornadas completadas, trabajadores activos, promedio de horas</li>
          <li>Desglose de alertas por tipo (respiratoria, ajuste, filtro, batería, desconexión)</li>
          <li>Top 5 trabajadores con más alertas</li>
          <li>Estado de vida útil de filtros (vencidos y próximos a vencer)</li>
          <li>Observaciones y recomendaciones automáticas basadas en los datos</li>
        </ul>
      </div>
    </div>
  );
}
