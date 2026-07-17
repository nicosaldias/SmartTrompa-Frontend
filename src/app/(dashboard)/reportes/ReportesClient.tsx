"use client";

import { useState, useEffect } from "react";
import { api } from "@/api/client";
import type { Trabajador, JornadaTrabajo } from "@/types";
import { FileText, Download, Calendar, AlertTriangle, Filter, User, Hash, Users } from "lucide-react";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import { abrirCalendario } from "@/utils/datePicker";

interface Props {
  alertasActivasCount: number;
  filtrosProximosCount: number;
  supervisores: Trabajador[];
  trabajadores: Trabajador[];
}

type Tab = "jornada" | "cuadrilla" | "trabajador" | "general";

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
    background: "var(--color-bg-card)",
    color: "var(--color-text-primary)",
  });
}

export default function ReportesClient({
  alertasActivasCount,
  filtrosProximosCount,
  supervisores,
  trabajadores,
}: Props) {
  const t = useT();
  const TABS: { key: Tab; label: string; icon: typeof Hash }[] = [
    { key: "jornada", label: t("reportes.tabJornada"), icon: Hash },
    { key: "cuadrilla", label: t("reportes.tabCuadrilla"), icon: Users },
    { key: "trabajador", label: t("reportes.tabTrabajador"), icon: User },
    { key: "general", label: t("reportes.tabGeneral"), icon: FileText },
  ];
  const [tab, setTab] = useState<Tab>("jornada");
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(today.getDate() - 30);

  const defaultDesde = formatDateTimeForInput(lastWeek, "00:00");
  const defaultHasta = formatDateTimeForInput(today, "23:59");

  // Tab Jornada: el usuario elige trabajador → jornada (ya no escribe un ID).
  const [rutJornadaTrabajador, setRutJornadaTrabajador] = useState("");
  const [jornadasDisponibles, setJornadasDisponibles] = useState<JornadaTrabajo[]>([]);
  const [loadingJornadas, setLoadingJornadas] = useState(false);
  const [idJornada, setIdJornada] = useState("");

  useEffect(() => {
    if (!rutJornadaTrabajador) {
      setJornadasDisponibles([]);
      setIdJornada("");
      return;
    }
    let cancelado = false;
    setLoadingJornadas(true);
    setIdJornada("");
    api.jornadas
      .byUsuario(rutJornadaTrabajador)
      .then((js) => {
        if (cancelado) return;
        // Más recientes primero
        const ordenadas = [...js].sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
        setJornadasDisponibles(ordenadas);
      })
      .catch(() => {
        if (!cancelado) setJornadasDisponibles([]);
      })
      .finally(() => {
        if (!cancelado) setLoadingJornadas(false);
      });
    return () => {
      cancelado = true;
    };
  }, [rutJornadaTrabajador]);

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
      alerta({ icon: "warning", title: t("reportes.datesRequiredTitle"), text: t("reportes.datesRequiredText") });
      return false;
    }
    if (desde > hasta) {
      alerta({ icon: "warning", title: t("reportes.invalidRangeTitle"), text: t("reportes.invalidRangeText") });
      return false;
    }
    return true;
  }

  async function descargar(fn: () => Promise<Blob>, filename: string) {
    setLoading(true);
    try {
      const blob = await fn();
      downloadBlob(blob, filename);
      alerta({ icon: "success", title: t("reportes.reportGeneratedTitle"), text: t("reportes.reportGeneratedText"), timer: 1800 });
    } catch (err: unknown) {
      alerta({ icon: "error", title: t("common.error"), text: (err as Error).message || t("reportes.reportFailedText") });
    } finally {
      setLoading(false);
    }
  }

  function labelJornada(j: JornadaTrabajo): string {
    const f = new Date(j.inicio);
    const dd = String(f.getDate()).padStart(2, "0");
    const mm = String(f.getMonth() + 1).padStart(2, "0");
    const hh = String(f.getHours()).padStart(2, "0");
    const min = String(f.getMinutes()).padStart(2, "0");
    const fecha = `${dd}/${mm}/${f.getFullYear()} ${hh}:${min}`;
    const ubic = j.ubicacion?.nombre ? ` · ${j.ubicacion.nombre}` : "";
    const estado = j.terminada ? "" : ` · ${t("reportes.jornadaEnCurso")}`;
    return `#${j.id} · ${fecha}${ubic}${estado}`;
  }

  async function handleJornada() {
    const id = Number(idJornada);
    if (!Number.isFinite(id) || id <= 0) {
      alerta({ icon: "warning", title: t("reportes.invalidIdTitle"), text: t("reportes.selectJornadaText") });
      return;
    }
    await descargar(() => api.reportes.jornada(id), `reporte_jornada_${id}.pdf`);
  }

  async function handleCuadrilla() {
    if (!rutSupervisor) {
      alerta({ icon: "warning", title: t("reportes.supervisorRequiredTitle"), text: t("reportes.supervisorRequiredText") });
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
      alerta({ icon: "warning", title: t("reportes.workerRequiredTitle"), text: t("reportes.workerRequiredText") });
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
    <div className="reportes-root">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="reportes-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("reportes.title")}</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {t("reportes.subtitle")}
        </p>
      </div>

      <div
        className="reportes-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard color="#f59e0b" icon={<AlertTriangle size={22} color="#f59e0b" />} label={t("reportes.statActiveAlerts")} value={alertasActivasCount} />
        <StatCard color="#ef4444" icon={<Filter size={22} color="#ef4444" />} label={t("reportes.statFiltersExpiring")} value={filtrosProximosCount} />
        <StatCard color="#f97316" icon={<FileText size={22} color="#f97316" />} label={t("reportes.statReportTypes")} value={4} />
      </div>

      <div className="card reportes-card" style={{ maxWidth: 960 }}>
        <div
          className="reportes-tabs"
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
                className="reportes-tab-btn"
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
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("reportes.jornadaHeading")}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("reportes.jornadaDescription")}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}><User size={14} />{t("roles.worker")}</label>
              <select
                className="input-field"
                value={rutJornadaTrabajador}
                onChange={(e) => setRutJornadaTrabajador(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">{t("reportes.selectWorker")}</option>
                {trabajadores.map((w) => (
                  <option key={w.rut} value={w.rut}>
                    {w.nombre} {w.apellidoPaterno} — {w.rut}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}><Hash size={14} />{t("reportes.jornadaSelectLabel")}</label>
              <select
                className="input-field"
                value={idJornada}
                onChange={(e) => setIdJornada(e.target.value)}
                disabled={!rutJornadaTrabajador || loadingJornadas}
                style={{ width: "100%" }}
              >
                <option value="">
                  {loadingJornadas
                    ? t("reportes.loadingJornadas")
                    : !rutJornadaTrabajador
                      ? t("reportes.selectWorkerFirst")
                      : jornadasDisponibles.length === 0
                        ? t("reportes.noJornadas")
                        : t("reportes.selectJornada")}
                </option>
                {jornadasDisponibles.map((j) => (
                  <option key={j.id} value={String(j.id)}>
                    {labelJornada(j)}
                  </option>
                ))}
              </select>
            </div>
            <BotonGenerar onClick={handleJornada} loading={loading} t={t} />
          </div>
        )}

        {tab === "cuadrilla" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("reportes.cuadrillaHeading")}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("reportes.cuadrillaDescription")}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}><User size={14} />{t("roles.supervisor")}</label>
              <select
                className="input-field"
                value={rutSupervisor}
                onChange={(e) => setRutSupervisor(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">{t("reportes.selectSupervisor")}</option>
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
              t={t}
            />
            <BotonGenerar onClick={handleCuadrilla} loading={loading} t={t} />
          </div>
        )}

        {tab === "trabajador" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("reportes.trabajadorHeading")}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("reportes.trabajadorDescription")}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}><User size={14} />{t("roles.worker")}</label>
              <select
                className="input-field"
                value={rutTrabajador}
                onChange={(e) => setRutTrabajador(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">{t("reportes.selectWorker")}</option>
                {trabajadores.map((w) => (
                  <option key={w.rut} value={w.rut}>
                    {w.nombre} {w.apellidoPaterno} — {w.rut}
                  </option>
                ))}
              </select>
            </div>
            <RangoFechas
              desde={desdeTrabajador} setDesde={setDesdeTrabajador}
              hasta={hastaTrabajador} setHasta={setHastaTrabajador}
              t={t}
            />
            <BotonGenerar onClick={handleTrabajador} loading={loading} t={t} />
          </div>
        )}

        {tab === "general" && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("reportes.generalHeading")}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              {t("reportes.generalDescription")}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("semana")}>{t("reportes.presetThisWeek")}</button>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("mes")}>{t("reportes.presetThisMonth")}</button>
              <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => aplicarPresetGeneral("mesAnterior")}>{t("reportes.presetLastMonth")}</button>
            </div>
            <RangoFechas
              desde={desdeGeneral} setDesde={setDesdeGeneral}
              hasta={hastaGeneral} setHasta={setHastaGeneral}
              t={t}
            />
            <BotonGenerar onClick={handleGeneral} loading={loading} t={t} />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .reportes-title { font-size: 1.2rem !important; }
          .reportes-stats { grid-template-columns: 1fr !important; gap: 0.5rem !important; }
          .reportes-card { padding: 0.9rem !important; }
          .reportes-tabs { gap: 0 !important; }
          .reportes-tab-btn { flex: 1 1 45% !important; justify-content: center !important; padding: 0.5rem 0.4rem !important; font-size: 0.78rem !important; }
          .reportes-form-row { flex-direction: column !important; gap: 0.75rem !important; }
          .reportes-form-col { min-width: 0 !important; width: 100% !important; }
        }
      `}</style>
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
  desde, setDesde, hasta, setHasta, t,
}: {
  desde: string; setDesde: (v: string) => void;
  hasta: string; setHasta: (v: string) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="reportes-form-row" style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
      <div className="reportes-form-col" style={{ flex: 1, minWidth: 220 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
          <Calendar size={14} />{t("reportes.fromLabel")}
        </label>
        <input className="input-field" type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} onClick={abrirCalendario} style={{ width: "100%", cursor: "pointer" }} />
      </div>
      <div className="reportes-form-col" style={{ flex: 1, minWidth: 220 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
          <Calendar size={14} />{t("reportes.toLabel")}
        </label>
        <input className="input-field" type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} onClick={abrirCalendario} style={{ width: "100%", cursor: "pointer" }} />
      </div>
    </div>
  );
}

function BotonGenerar({ onClick, loading, t }: { onClick: () => void; loading: boolean; t: ReturnType<typeof useT> }) {
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
      {loading ? t("reportes.generatingReport") : t("reportes.generateReport")}
    </button>
  );
}
