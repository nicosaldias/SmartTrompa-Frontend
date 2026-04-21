"use client";

import { useState } from "react";
import { api } from "@/api/client";
import { FileText, Download, Calendar, AlertTriangle, Filter } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  alertasActivasCount: number;
  filtrosProximosCount: number;
}

export default function ReportesClient({ alertasActivasCount, filtrosProximosCount }: Props) {
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 7);
  const [desde, setDesde] = useState(formatDateForInput(lastWeekStart));
  const [hasta, setHasta] = useState(formatDateForInput(today));

  function formatDateForInput(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  async function handleDescargarReporte() {
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
    if (desde > hasta) {
      Swal.fire({
        icon: "warning",
        title: "Rango invalido",
        text: "La fecha 'Desde' no puede ser posterior a 'Hasta'",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }
    setLoading(true);
    try {
      const blob = await api.reportes.descargarPorJornada(desde, hasta);
      downloadBlob(blob, `reporte_jornadas_${desde}_${hasta}.pdf`);
      Swal.fire({
        icon: "success",
        title: "Reporte generado",
        text: "El PDF se descargo correctamente",
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
          Genera reportes PDF por jornada de trabajo para gerencia
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
            <p style={{ fontSize: "1rem", fontWeight: 600 }}>Por Jornada</p>
          </div>
        </div>
      </div>

      {/* Report form card */}
      <div className="card" style={{ maxWidth: 900 }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1rem" }}>
          Reporte por Jornada
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text-secondary)",
            marginBottom: "1.5rem",
            lineHeight: 1.5,
          }}
        >
          Selecciona el rango de fechas para generar el reporte por jornada de trabajo.
          Incluye el detalle de cada jornada con trabajador, supervisor, duracion y
          alertas registradas durante la sesion.
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
          onClick={handleDescargarReporte}
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
          {loading ? "Generando reporte..." : "Generar Reporte"}
        </button>
      </div>

      {/* Info section */}
      <div
        className="card"
        style={{
          marginTop: "1.5rem",
          maxWidth: 900,
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
          <li>Resumen de jornadas y tandas en el periodo seleccionado</li>
          <li>Estado de cada trabajador por jornada (supervisor, duracion, ubicacion)</li>
          <li>Alertas por tipo durante las jornadas (respiratoria, ajuste, filtro, bateria, desconexion)</li>
          <li>Desglose de alertas individuales por cada jornada de trabajo</li>
          <li>Observaciones y recomendaciones automaticas basadas en los datos</li>
        </ul>
      </div>
    </div>
  );
}
