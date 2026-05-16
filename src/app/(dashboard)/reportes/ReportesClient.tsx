"use client";

import { useState } from "react";
import { api } from "@/api/client";
import type { Trabajador } from "@/types";
import { FileText, Download, Calendar, AlertTriangle, Filter, User } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  alertasActivasCount: number;
  filtrosProximosCount: number;
  supervisores: Trabajador[];
}

export default function ReportesClient({ alertasActivasCount, filtrosProximosCount, supervisores }: Props) {
  const [loading, setLoading] = useState(false);
  const [supervisor, setSupervisor] = useState("");

  // Default: last 7 days, start at 00:00 and end at 23:59
  const today = new Date();
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 7);
  const [desde, setDesde] = useState(formatDateTimeForInput(lastWeekStart, "00:00"));
  const [hasta, setHasta] = useState(formatDateTimeForInput(today, "23:59"));

  function formatDateTimeForInput(d: Date, time: string): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${time}`;
  }

  async function handleDescargarReporte() {
    if (!desde || !hasta) {
      Swal.fire({
        icon: "warning",
        title: "Fechas requeridas",
        text: "Seleccione fecha/hora desde y hasta",
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
      const blob = await api.reportes.descargarPorJornada(desde, hasta, supervisor || undefined);
      const desdeDate = desde.split("T")[0];
      const hastaDate = hasta.split("T")[0];
      downloadBlob(blob, `reporte_jornadas_${desdeDate}_${hastaDate}.pdf`);
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
          Genera reportes PDF por jornada de trabajo con detalle de alertas
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
          Selecciona el supervisor, rango de fechas y hora para generar el reporte.
          Incluye detalle de cada alerta con timestamp, valores medidos, umbrales de referencia
          y tiempo de resolucion.
        </p>

        {/* Supervisor selector */}
        <div style={{ marginBottom: "1rem" }}>
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
            <User size={14} />
            Supervisor
          </label>
          <select
            className="input-field"
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="">Todos los supervisores</option>
            {supervisores.map((s) => (
              <option key={s.rut} value={s.rut}>
                {s.nombre} {s.apellidoPaterno} — {s.rut}
              </option>
            ))}
          </select>
        </div>

        {/* Date range with datetime-local */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
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
              type="datetime-local"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
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
              type="datetime-local"
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
          <li>Supervisor responsable y periodo con precision de hora/minuto</li>
          <li>Resumen de jornadas y alertas por tipo en el periodo</li>
          <li>Detalle de cada alerta ordenada por timestamp</li>
          <li>Valores medidos vs umbrales de referencia configurados</li>
          <li>Estado de cada alerta (activa/resuelta) y tiempo de resolucion</li>
          <li>Observaciones y recomendaciones automaticas</li>
        </ul>
      </div>
    </div>
  );
}
