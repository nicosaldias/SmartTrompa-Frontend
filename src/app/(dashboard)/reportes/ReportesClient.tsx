"use client";

import { useState } from "react";
import { api } from "@/api/client";
import type { Trabajador } from "@/types";
import { FileText, Download, Calendar, AlertTriangle, Filter, User, Hash, Users } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  alertasActivasCount: number;
  filtrosProximosCount: number;
  supervisores: Trabajador[];
  trabajadores: Trabajador[];
}

type Tab = "jornada" | "cuadrilla" | "trabajador" | "general";

const TABS: { key: Tab; label: string; icon: typeof Hash }[] = [
  { key: "jornada", label: "Por Jornada", icon: Hash },
  { key: "cuadrilla", label: "Por Cuadrilla", icon: Users },
  { key: "trabajador", label: "Por Trabajador", icon: User },
  { key: "general", label: "General", icon: FileText },
];

function formatDateTimeForInput(d: Date, time: string): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${time}`;
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

function alerta(opts: { icon: "warning" | "error" | "success"; title: string; text: string; timer?: number }) {
  Swal.fire({
    ...opts,
    showConfirmButton: opts.icon !== "success",
    background: "#1c2333",
    color: "#e6edf3",
  });
}

export default function ReportesClient({
  alertasActivasCount,
  filtrosProximosCount,
  supervisores,
  trabajadores,
}: Props) {
  const [tab, setTab] = useState<Tab>("jornada");
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(today.getDate() - 30);

  const defaultDesde = formatDateTimeForInput(lastWeek, "00:00");
  const defaultHasta = formatDateTimeForInput(today, "23:59");

  const [idJornada, setIdJornada] = useState("");

  const [rutSupervisor, setRutSupervisor] = useState("");
  const [desdeCuadrilla, setDesdeCuadrilla] = useState(defaultDesde);
  const [hastaCuadrilla, setHastaCuadrilla] = useState(defaultHasta);

  const [rutTrabajador, setRutTrabajador] = useState("");
  const [desdeTrabajador, setDesdeTrabajador] = useState(defaultDesde);
  const [hastaTrabajador, setHastaTrabajador] = useState(defaultHasta);

  const [desdeGeneral, setDesdeGeneral] = useState(defaultDesde);
  const [hastaGeneral, setHastaGeneral] = useState(defaultHasta);

  function validarRango(desde: string, hasta: string): boolean {
    if (!desde || !hasta) {
      alerta({ icon: "warning", title: "Fechas requeridas", text: "Seleccione 'desde' y 'hasta'." });
      return false;
    }
    if (desde > hasta) {
      alerta({ icon: "warning", title: "Rango inválido", text: "'Desde' no puede ser posterior a 'Hasta'." });
      return false;
    }
    return true;
  }

  async function descargar(fn: () => Promise<Blob>, filename: string) {
    setLoading(true);
    try {
      const blob = await fn();
      downloadBlob(blob, filename);
      alerta({ icon: "success", title: "Reporte generado", text: "El PDF se descargó correctamente.", timer: 1800 });
    } catch (err: unknown) {
      alerta({ icon: "error", title: "Error", text: (err as Error).message || "No se pudo generar el reporte." });
    } finally {
      setLoading(false);
    }
  }

  async function handleJornada() {
    const id = Number(idJornada);
    if (!Number.isFinite(id) || id <= 0) {
      alerta({ icon: "warning", title: "ID inválido", text: "Ingrese un ID de jornada numérico." });
      return;
    }
    await descargar(() => api.reportes.jornada(id), `reporte_jornada_${id}.pdf`);
  }

  async function handleCuadrilla() {
    if (!rutSupervisor) {
      alerta({ icon: "warning", title: "Supervisor requerido", text: "Seleccione un supervisor." });
      return;
    }
    if (!validarRango(desdeCuadrilla, hastaCuadrilla)) return;
    await descargar(
      () => api.reportes.cuadrilla(rutSupervisor, desdeCuadrilla, hastaCuadrilla),
      `reporte_cuadrilla_${rutSupervisor}_${desdeCuadrilla.split("T")[0]}_${hastaCuadrilla.split("T")[0]}.pdf`
    );
  }

  async function handleTrabajador() {
    if (!rutTrabajador) {
      alerta({ icon: "warning", title: "Trabajador requerido", text: "Seleccione un trabajador." });
      return;
    }
    if (!validarRango(desdeTrabajador, hastaTrabajador)) return;
    await descargar(
      () => api.reportes.trabajador(rutTrabajador, desdeTrabajador, hastaTrabajador),
      `reporte_trabajador_${rutTrabajador}_${desdeTrabajador.split("T")[0]}_${hastaTrabajador.split("T")[0]}.pdf`
    );
  }

  async function handleGeneral() {
    if (!validarRango(desdeGeneral, hastaGeneral)) return;
    await descargar(
      () => api.reportes.general(desdeGeneral, hastaGeneral),
      `reporte_general_${desdeGeneral.split("T")[0]}_${hastaGeneral.split("T")[0]}.pdf`
    );
  }

  function aplicarPresetGeneral(preset: "semana" | "mes" | "mesAnterior") {
    const ahora = new Date();
    if (preset === "semana") {
      const inicio = new Date(ahora);
      inicio.setDate(ahora.getDate() - ahora.getDay());
      setDesdeGeneral(formatDateTimeForInput(inicio, "00:00"));
      setHastaGeneral(formatDateTimeForInput(ahora, "23:59"));
    } else if (preset === "mes") {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      setDesdeGeneral(formatDateTimeForInput(inicio, "00:00"));
      setHastaGeneral(formatDateTimeForInput(ahora, "23:59"));
    } else {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      setDesdeGeneral(formatDateTimeForInput(inicio, "00:00"));
      setHastaGeneral(formatDateTimeForInput(fin, "23:59"));
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    marginBottom: "0.375rem",
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Reportes de Seguridad</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Genera reportes PDF por jornada, cuadrilla, trabajador o consolidado general.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard color="#f59e0b" icon={<AlertTriangle size={22} color="#f59e0b" />} label="Alertas activas" value={alertasActivasCount} />
        <StatCard color="#ef4444" icon={<Filter size={22} color="#ef4444" />} label="Filtros por vencer" value={filtrosProximosCount} />
        <StatCard color="#f97316" icon={<FileText size={22} color="#f97316" />} label="Tipos de reporte" value={4} />
      </div>

      <div className="card" style={{ maxWidth: 960 }}>
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const activo = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.625rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "none",
                  background: "transparent",
                  color: activo ? "var(--color-accent)" : "var(--color-text-secondary)",
                  borderBottom: activo ? "2px solid var(--color-accent)" : "2px solid transparent",
                  marginBottom: "-1px",
                  cursor: "pointer",
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "jornada" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>Reporte por jornada individual</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Detalle completo de una jornada específica: trabajador, supervisor, equipamiento, timeline de alertas y observaciones.
            </p>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}><Hash size={14} />ID de jornada</label>
              <input
                className="input-field"
                type="number"
                min={1}
                value={idJornada}
                onChange={(e) => setIdJornada(e.target.value)}
                placeholder="Ej. 1234"
                style={{ width: "100%", maxWidth: 280 }}
              />
            </div>
            <BotonGenerar onClick={handleJornada} loading={loading} />
          </div>
        )}

        {tab === "cuadrilla" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>Reporte por cuadrilla</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Agregación de jornadas bajo un mismo supervisor en el rango seleccionado, con distribución por tipo, alertas por día y ranking de trabajadores.
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}><User size={14} />Supervisor</label>
              <select
                className="input-field"
                value={rutSupervisor}
                onChange={(e) => setRutSupervisor(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Seleccione un supervisor</option>
                {supervisores.map((s) => (
                  <option key={s.rut} value={s.rut}>
                    {s.nombre} {s.apellidoPaterno} — {s.rut}
                  </option>
                ))}
              </select>
            </div>
            <RangoFechas
              desde={desdeCuadrilla} setDesde={setDesdeCuadrilla}
              hasta={hastaCuadrilla} setHasta={setHastaCuadrilla}
            />
            <BotonGenerar onClick={handleCuadrilla} loading={loading} />
          </div>
        )}

        {tab === "trabajador" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>Reporte por trabajador</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Todas las jornadas de un trabajador en el rango, con donut por tipo, barras por jornada y observaciones automáticas.
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}><User size={14} />Trabajador</label>
              <select
                className="input-field"
                value={rutTrabajador}
                onChange={(e) => setRutTrabajador(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Seleccione un trabajador</option>
                {trabajadores.map((t) => (
                  <option key={t.rut} value={t.rut}>
                    {t.nombre} {t.apellidoPaterno} — {t.rut}
                  </option>
                ))}
              </select>
            </div>
            <RangoFechas
              desde={desdeTrabajador} setDesde={setDesdeTrabajador}
              hasta={hastaTrabajador} setHasta={setHastaTrabajador}
            />
            <BotonGenerar onClick={handleTrabajador} loading={loading} />
          </div>
        )}

        {tab === "general" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>Reporte general consolidado</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Consolidado de toda la operación en el periodo: top trabajadores, resumen por supervisor y estado de la flota de filtros.
              Si es supervisor, el alcance se recortará automáticamente a sus jornadas.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("semana")}>Esta semana</button>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("mes")}>Este mes</button>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("mesAnterior")}>Mes anterior</button>
            </div>
            <RangoFechas
              desde={desdeGeneral} setDesde={setDesdeGeneral}
              hasta={hastaGeneral} setHasta={setHastaGeneral}
            />
            <BotonGenerar onClick={handleGeneral} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card" style={{ padding: "1.1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
      <div
        style={{
          width: 44, height: 44, borderRadius: "0.5rem",
          backgroundColor: "rgba(249,115,22,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{label}</p>
        <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</p>
      </div>
    </div>
  );
}

function RangoFechas({
  desde, setDesde, hasta, setHasta,
}: {
  desde: string; setDesde: (v: string) => void;
  hasta: string; setHasta: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
          <Calendar size={14} />Desde
        </label>
        <input className="input-field" type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
          <Calendar size={14} />Hasta
        </label>
        <input className="input-field" type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: "100%" }} />
      </div>
    </div>
  );
}

function BotonGenerar({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      className="btn-primary"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        width: "100%", justifyContent: "center", padding: "0.75rem",
      }}
    >
      <Download size={18} />
      {loading ? "Generando reporte..." : "Generar reporte"}
    </button>
  );
}
