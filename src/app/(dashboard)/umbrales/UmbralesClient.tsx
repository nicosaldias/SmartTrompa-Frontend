"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/api/client";
import { API_BASE_URL } from "@/api/endpoints";
import type { AlertasUmbrales, Trabajador } from "@/types";
import { DEFAULT_THRESHOLDS } from "@/utils/sensorMappings";
import { fmtNum } from "@/utils/format";
import { validarOrdenUmbrales } from "./validacionUmbrales";
import Swal from "sweetalert2";
import { Search, Plus, Pencil, Trash2, RotateCcw, Users, Check } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import EmptyState from "@/components/EmptyState";

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, "").toLowerCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export default function UmbralesClient() {
  const t = useT();
  const [umbrales, setUmbrales] = useState<AlertasUmbrales[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [selectedRuts, setSelectedRuts] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState("");
  const [editando, setEditando] = useState<AlertasUmbrales | null>(null);
  const [bulkForm, setBulkForm] = useState({
    alrtRespAlto: "",
    alrtRespBajo: "",
    alrtAjus: "",
    alrtFiltrAlto: "",
    alrtFiltrBajo: "",
    alrtBateAlto: "",
    alrtBateMedio: "",
    alrtBateBajo: "",
  });
  const [form, setForm] = useState({
    rutTrabajador: "",
    alrtRespAlto: "",
    alrtRespBajo: "",
    alrtAjus: "",
    alrtFiltrAlto: "",
    alrtFiltrBajo: "",
    alrtBateAlto: "",
    alrtBateMedio: "",
    alrtBateBajo: "",
  });

  async function cargarDatos() {
    setLoading(true);
    try {
      const [umbData, trabData] = await Promise.all([
        api.umbrales.list(),
        api.trabajadores.list(),
      ]);
      setUmbrales(umbData);
      setTrabajadores(trabData);
    } catch (err) {
      console.error("Error cargando umbrales:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const trabajadorPorRut = useMemo(() => {
    const map = new Map<string, Trabajador>();
    for (const trab of trabajadores) map.set(trab.rut, trab);
    return map;
  }, [trabajadores]);

  const umbralesFiltrados = useMemo(() => {
    if (!busqueda) return umbrales;
    const q = busqueda.toLowerCase();
    return umbrales.filter((u) => {
      const trab = u.rutTrabajador ? trabajadorPorRut.get(u.rutTrabajador) : undefined;
      const nombre = trab
        ? `${trab.nombre} ${trab.apellidoPaterno} ${trab.apellidoMaterno}`.toLowerCase()
        : "";
      return u.rutTrabajador?.toLowerCase().includes(q) || nombre.includes(q);
    });
  }, [umbrales, busqueda, trabajadorPorRut]);

  function abrirCrear() {
    setEditando(null);
    setForm({
      rutTrabajador: "",
      alrtRespAlto: "",
      alrtRespBajo: "",
      alrtAjus: "",
      alrtFiltrAlto: "",
      alrtFiltrBajo: "",
      alrtBateAlto: "",
      alrtBateMedio: "",
      alrtBateBajo: "",
    });
    setShowForm(true);
  }

  function abrirEditar(u: AlertasUmbrales) {
    setEditando(u);
    setForm({
      rutTrabajador: u.rutTrabajador || "",
      alrtRespAlto: u.alrtRespAlto?.toString() || "",
      alrtRespBajo: u.alrtRespBajo?.toString() || "",
      alrtAjus: u.alrtAjus?.toString() || "",
      alrtFiltrAlto: u.alrtFiltrAlto?.toString() || "",
      alrtFiltrBajo: u.alrtFiltrBajo?.toString() || "",
      alrtBateAlto: u.alrtBateAlto?.toString() || "",
      alrtBateMedio: u.alrtBateMedio?.toString() || "",
      alrtBateBajo: u.alrtBateBajo?.toString() || "",
    });
    setShowForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    // Validate threshold relationships
    const errors = validarOrdenUmbrales(form).map((clave) => t(clave));

    if (errors.length > 0) {
      await Swal.fire({
        icon: "error",
        title: t("umbrales.validation.errorTitle"),
        html: errors.map((e) => `• ${e}`).join("<br/>"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editando ? t("umbrales.confirm.update") : t("umbrales.confirm.create"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("umbrales.confirm.saveBtn"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;
    const data: Partial<AlertasUmbrales> = {
      rutTrabajador: form.rutTrabajador,
      alrtRespAlto: form.alrtRespAlto ? Number(form.alrtRespAlto) : undefined,
      alrtRespBajo: form.alrtRespBajo ? Number(form.alrtRespBajo) : undefined,
      alrtAjus: form.alrtAjus ? Number(form.alrtAjus) : undefined,
      alrtFiltrAlto: form.alrtFiltrAlto ? Number(form.alrtFiltrAlto) : undefined,
      alrtFiltrBajo: form.alrtFiltrBajo ? Number(form.alrtFiltrBajo) : undefined,
      alrtBateAlto: form.alrtBateAlto ? Number(form.alrtBateAlto) : undefined,
      alrtBateMedio: form.alrtBateMedio ? Number(form.alrtBateMedio) : undefined,
      alrtBateBajo: form.alrtBateBajo ? Number(form.alrtBateBajo) : undefined,
    };

    try {
      if (editando) {
        await api.umbrales.update(editando.id, data);
      } else {
        await api.umbrales.create(data);
      }
      Swal.fire({
        icon: "success",
        title: editando ? t("umbrales.toast.updated") : t("umbrales.toast.created"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        timer: 1500,
        showConfirmButton: false,
      });
      setShowForm(false);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  async function eliminar(id: number) {
    const result = await Swal.fire({
      title: t("umbrales.delete.title"),
      text: t("umbrales.delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("common.delete"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await api.umbrales.delete(id);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  function toggleRut(rut: string) {
    setSelectedRuts((prev) =>
      prev.includes(rut) ? prev.filter((r) => r !== rut) : [...prev, rut]
    );
  }

  function selectAllTrabajadores() {
    if (selectedRuts.length === trabajadores.length) {
      setSelectedRuts([]);
    } else {
      setSelectedRuts(trabajadores.map((t) => t.rut));
    }
  }

  const trabajadoresFiltradosBulk = useMemo(() => {
    if (!bulkSearch) return trabajadores;
    const q = bulkSearch.toLowerCase();
    return trabajadores.filter(
      (t) =>
        t.rut.toLowerCase().includes(q) ||
        t.nombre?.toLowerCase().includes(q) ||
        t.apellidoPaterno?.toLowerCase().includes(q)
    );
  }, [trabajadores, bulkSearch]);

  function abrirBulk() {
    setSelectedRuts([]);
    setBulkSearch("");
    setBulkForm({
      alrtRespAlto: "",
      alrtRespBajo: "",
      alrtAjus: "",
      alrtFiltrAlto: "",
      alrtFiltrBajo: "",
      alrtBateAlto: "",
      alrtBateMedio: "",
      alrtBateBajo: "",
    });
    setShowBulkForm(true);
  }

  function fillBulkDefaults() {
    setBulkForm({
      alrtRespAlto: String(DEFAULT_THRESHOLDS.respAlto),
      alrtRespBajo: String(DEFAULT_THRESHOLDS.respBajo),
      alrtAjus: String(DEFAULT_THRESHOLDS.ajuste),
      alrtFiltrAlto: String(DEFAULT_THRESHOLDS.filtroAlto),
      alrtFiltrBajo: String(DEFAULT_THRESHOLDS.filtroMedio),
      alrtBateAlto: String(DEFAULT_THRESHOLDS.bateAlto),
      alrtBateMedio: String(DEFAULT_THRESHOLDS.bateMedio),
      alrtBateBajo: String(DEFAULT_THRESHOLDS.bateBajo),
    });
  }

  async function guardarBulk(e: React.FormEvent) {
    e.preventDefault();

    if (selectedRuts.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: t("umbrales.bulk.noWorkersTitle"),
        text: t("umbrales.bulk.noWorkersText"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }

    // Validaciones (mismas que el form individual)
    const errors = validarOrdenUmbrales(bulkForm).map((clave) => t(clave));

    if (errors.length > 0) {
      await Swal.fire({
        icon: "error",
        title: t("umbrales.validation.errorTitle"),
        html: errors.map((e) => `• ${e}`).join("<br/>"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: t("umbrales.bulk.confirmTitle"),
      html: t("umbrales.bulk.confirmHtml", { count: selectedRuts.length }),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("umbrales.bulk.applyBtn"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;

    const umbralesData = {
      alrtRespAlto: bulkForm.alrtRespAlto ? Number(bulkForm.alrtRespAlto) : undefined,
      alrtRespBajo: bulkForm.alrtRespBajo ? Number(bulkForm.alrtRespBajo) : undefined,
      alrtAjus: bulkForm.alrtAjus ? Number(bulkForm.alrtAjus) : undefined,
      alrtFiltrAlto: bulkForm.alrtFiltrAlto ? Number(bulkForm.alrtFiltrAlto) : undefined,
      alrtFiltrBajo: bulkForm.alrtFiltrBajo ? Number(bulkForm.alrtFiltrBajo) : undefined,
      alrtBateAlto: bulkForm.alrtBateAlto ? Number(bulkForm.alrtBateAlto) : undefined,
      alrtBateMedio: bulkForm.alrtBateMedio ? Number(bulkForm.alrtBateMedio) : undefined,
      alrtBateBajo: bulkForm.alrtBateBajo ? Number(bulkForm.alrtBateBajo) : undefined,
    };

    try {
      await api.umbrales.bulk(selectedRuts, umbralesData);
      Swal.fire({
        icon: "success",
        title: t("umbrales.bulk.successTitle"),
        text: t("umbrales.bulk.successText", { count: selectedRuts.length }),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        timer: 2000,
        showConfirmButton: false,
      });
      setShowBulkForm(false);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  const CAMPOS_UMBRAL = [
    { key: "alrtRespAlto", label: t("umbrales.fields.respAlto"), unit: "bpm", defaultVal: DEFAULT_THRESHOLDS.respAlto, help: t("umbrales.help.respAlto") },
    { key: "alrtRespBajo", label: t("umbrales.fields.respBajo"), unit: "bpm", defaultVal: DEFAULT_THRESHOLDS.respBajo, help: t("umbrales.help.respBajo") },
    { key: "alrtAjus", label: t("umbrales.fields.ajuste"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.ajuste, help: t("umbrales.help.ajuste") },
    { key: "alrtFiltrAlto", label: t("umbrales.fields.filtrAlto"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.filtroAlto, help: t("umbrales.help.filtrAlto") },
    { key: "alrtFiltrBajo", label: t("umbrales.fields.filtrBajo"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.filtroMedio, help: t("umbrales.help.filtrBajo") },
    { key: "alrtBateAlto", label: t("umbrales.fields.bateAlto"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateAlto, help: t("umbrales.help.bateAlto") },
    { key: "alrtBateMedio", label: t("umbrales.fields.bateMedio"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateMedio, help: t("umbrales.help.bateMedio") },
    { key: "alrtBateBajo", label: t("umbrales.fields.bateBajo"), unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateBajo, help: t("umbrales.help.bateBajo") },
  ] as const;

  function fillDefaults() {
    setForm({
      ...form,
      alrtRespAlto: String(DEFAULT_THRESHOLDS.respAlto),
      alrtRespBajo: String(DEFAULT_THRESHOLDS.respBajo),
      alrtAjus: String(DEFAULT_THRESHOLDS.ajuste),
      alrtFiltrAlto: String(DEFAULT_THRESHOLDS.filtroAlto),
      alrtFiltrBajo: String(DEFAULT_THRESHOLDS.filtroMedio),
      alrtBateAlto: String(DEFAULT_THRESHOLDS.bateAlto),
      alrtBateMedio: String(DEFAULT_THRESHOLDS.bateMedio),
      alrtBateBajo: String(DEFAULT_THRESHOLDS.bateBajo),
    });
  }

  function formatWithUnit(value: number | null | undefined, unit: string): string {
    if (value == null) return "—";
    return unit === "%" ? `${fmtNum(value)}%` : `${fmtNum(value)} ${unit}`;
  }

  return (
    <div>
      <div className="umbrales-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="umbrales-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("umbrales.title")}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {t("umbrales.subtitle")}
          </p>
        </div>
        <div className="umbrales-header-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={abrirBulk} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={16} /> {t("umbrales.bulkConfigBtn")}
          </button>
          <button className="btn-primary" onClick={abrirCrear} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> {t("umbrales.newThresholdBtn")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: "0.75rem 1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Search size={16} color="var(--color-text-secondary)" />
          <input
            className="input-field"
            placeholder={t("umbrales.searchPlaceholder")}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ border: "none", background: "transparent", flex: 1 }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>{t("umbrales.loadingThresholds")}</p>
        </div>
      ) : umbralesFiltrados.length === 0 ? (
        <EmptyState
          title={busqueda ? t("umbrales.empty.notFound") : t("umbrales.empty.none")}
          hint={busqueda ? t("umbrales.empty.tryOtherTerm") : t("umbrales.empty.addFirst")}
        >
          {/* Vacío honesto: sin registros el sistema NO deja de evaluar — usa estos
              defaults (los mismos de la app). Ocultarlos hacía indescifrable de
              dónde salían las alertas CRITICO de frecuencia respiratoria. */}
          {!busqueda && (
            <div style={{
              marginTop: "1.25rem",
              display: "inline-block",
              textAlign: "left",
              padding: "0.875rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px dashed var(--color-border)",
              backgroundColor: "rgba(139,148,158,0.05)",
            }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                {t("umbrales.empty.defaultsTitle")}
              </p>
              <ul style={{ fontSize: "0.8rem", color: "var(--color-text-primary)", listStyle: "none", display: "grid", gap: "0.25rem" }}>
                <li>{t("umbrales.fields.respBajo")}: <strong>{DEFAULT_THRESHOLDS.respBajo} bpm</strong> · {t("umbrales.fields.respAlto")}: <strong>{DEFAULT_THRESHOLDS.respAlto} bpm</strong></li>
                <li>{t("umbrales.fields.ajusteUmbral")}: <strong>{DEFAULT_THRESHOLDS.ajuste} %</strong></li>
                <li>{t("umbrales.fields.bateBajo")}: <strong>{DEFAULT_THRESHOLDS.bateBajo} %</strong> · {t("umbrales.fields.bateMedio")}: <strong>{DEFAULT_THRESHOLDS.bateMedio} %</strong> · {t("umbrales.fields.bateAlto")}: <strong>{DEFAULT_THRESHOLDS.bateAlto} %</strong></li>
              </ul>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
                {t("umbrales.empty.defaultsHint")}
              </p>
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="card umbrales-table-wrap" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "left", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("umbrales.table.worker")}
                </th>
                {CAMPOS_UMBRAL.map((c) => (
                  <th key={c.key} style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {umbralesFiltrados.map((u) => {
                const trab = u.rutTrabajador ? trabajadorPorRut.get(u.rutTrabajador) : undefined;
                return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {trab?.tieneImagen ? (
                        <img
                          src={`${API_BASE_URL}/trabajador/${trab.rut}/imagen/`}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #f97316, #ea580c)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            flexShrink: 0,
                          }}
                        >
                          {trab ? getInitials(trab.nombre, trab.apellidoPaterno) : "—"}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {trab ? `${trab.nombre} ${trab.apellidoPaterno} ${trab.apellidoMaterno}` : "—"}
                        </div>
                        <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", marginTop: "0.125rem" }}>
                          {u.rutTrabajador ? formatRut(u.rutTrabajador) : "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {CAMPOS_UMBRAL.map((c) => (
                    <td key={c.key} style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      {formatWithUnit(u[c.key] as number | null | undefined, c.unit)}
                    </td>
                  ))}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                      <button onClick={() => abrirEditar(u)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0.25rem" }} title={t("common.edit")}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => eliminar(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.25rem" }} title={t("common.delete")}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal bulk */}
      {showBulkForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowBulkForm(false)}>
          <div className="card modal-content modal-umbrales" style={{ width: "100%", maxWidth: 1100, padding: "2rem", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              {t("umbrales.bulk.modalTitle")}
            </h2>
            <form onSubmit={guardarBulk} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Seleccion de trabajadores */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {t("umbrales.bulk.selectWorkers", { selected: selectedRuts.length, total: trabajadores.length })}
                  </p>
                  <button type="button" onClick={selectAllTrabajadores} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.75rem", fontWeight: 600 }}>
                    {selectedRuts.length === trabajadores.length ? t("umbrales.bulk.deselectAll") : t("umbrales.bulk.selectAll")}
                  </button>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <input
                    className="input-field"
                    placeholder={t("umbrales.bulk.searchWorkerPlaceholder")}
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--color-border)", borderRadius: "0.5rem", padding: "0.25rem" }}>
                  {trabajadoresFiltradosBulk.map((t) => {
                    const selected = selectedRuts.includes(t.rut);
                    return (
                      <div
                        key={t.rut}
                        onClick={() => toggleRut(t.rut)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          cursor: "pointer",
                          borderRadius: "0.375rem",
                          background: selected ? "rgba(249,115,22,0.15)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: "0.25rem",
                          border: selected ? "2px solid var(--color-accent)" : "2px solid var(--color-border)",
                          background: selected ? "var(--color-accent)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {selected && <Check size={12} color="#fff" />}
                        </div>
                        <span style={{ fontSize: "0.8rem" }}>
                          {t.nombre} {t.apellidoPaterno} — <span style={{ color: "var(--color-text-secondary)" }}>{t.rut}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Umbrales de respiracion */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  {t("umbrales.sections.respiracion")}
                </p>
                <div className="umbrales-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.respAlto")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.respAlto)} value={bulkForm.alrtRespAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtRespAlto: e.target.value })} style={{ paddingRight: "3rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.respBajo")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.respBajo)} value={bulkForm.alrtRespBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtRespBajo: e.target.value })} style={{ paddingRight: "3rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Umbrales de filtro */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.25rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  {t("umbrales.sections.filtro")}
                </p>
                {/* Honestidad de gobernanza (F3): estos dos campos NO gobiernan la
                    decisión de saturación de la app — son deltas fijos de la spec
                    del cliente. Fingir configuración es peor que decirlo. */}
                <p style={{ fontSize: "0.7rem", color: "#f59e0b", marginBottom: "0.5rem" }}>
                  {t("umbrales.sections.filtroNota")}
                </p>
                <div className="umbrales-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.filtrAltoLabel")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.filtroAlto)} value={bulkForm.alrtFiltrAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtFiltrAlto: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.filtrBajoLabel")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.filtroMedio)} value={bulkForm.alrtFiltrBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtFiltrBajo: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Umbrales de bateria */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  {t("umbrales.sections.bateria")}
                </p>
                <div className="umbrales-form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.bateAltoLabel")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateAlto)} value={bulkForm.alrtBateAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateAlto: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateAlto")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.bateMedioLabel")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateMedio)} value={bulkForm.alrtBateMedio} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateMedio: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateMedio")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.bateBajoLabel")}</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateBajo)} value={bulkForm.alrtBateBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateBajo: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateBajo")}</p>
                  </div>
                </div>
              </div>

              {/* Ajuste */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  {t("umbrales.sections.ajuste")}
                </p>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>{t("umbrales.fields.ajusteUmbral")}</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.ajuste)} value={bulkForm.alrtAjus} onChange={(e) => setBulkForm({ ...bulkForm, alrtAjus: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                  </div>
                </div>
              </div>

              <div className="umbrales-modal-actions" style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowBulkForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  {t("common.cancel")}
                </button>
                <button type="button" onClick={fillBulkDefaults} className="btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                  <RotateCcw size={14} /> {t("umbrales.defaultValuesBtn")}
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {t("umbrales.bulk.applyToCount", { count: selectedRuts.length })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div className="card modal-content modal-umbrales" style={{ width: "100%", maxWidth: 960, padding: "2rem", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              {editando ? t("umbrales.form.editTitle") : t("umbrales.form.newTitle")}
            </h2>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Section: Trabajador */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("umbrales.sections.trabajador")}
                </p>
                <select
                  className="input-field"
                  value={form.rutTrabajador}
                  onChange={(e) => setForm({ ...form, rutTrabajador: e.target.value })}
                  required
                  disabled={!!editando}
                >
                  <option value="">{t("umbrales.form.selectWorker")}</option>
                  {trabajadores.map((t) => (
                    <option key={t.rut} value={t.rut}>
                      {t.nombre} {t.apellidoPaterno} — {t.rut}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section: Umbrales de respiracion */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("umbrales.sections.respiracion")}
                </p>
                <div className="umbrales-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.respAlto")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.respAlto)}
                        value={form.alrtRespAlto}
                        onChange={(e) => setForm({ ...form, alrtRespAlto: e.target.value })}
                        style={{ paddingRight: "3rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.respAlto")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.respBajo")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.respBajo)}
                        value={form.alrtRespBajo}
                        onChange={(e) => setForm({ ...form, alrtRespBajo: e.target.value })}
                        style={{ paddingRight: "3rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.respBajo")}</p>
                  </div>
                </div>
              </div>

              {/* Section: Umbrales de filtro */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("umbrales.sections.filtro")}
                </p>
                <p style={{ fontSize: "0.7rem", color: "#f59e0b", marginBottom: "0.5rem" }}>
                  {t("umbrales.sections.filtroNota")}
                </p>
                <div className="umbrales-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.filtrAltoLabel")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.filtroAlto)}
                        value={form.alrtFiltrAlto}
                        onChange={(e) => setForm({ ...form, alrtFiltrAlto: e.target.value })}
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.filtrAlto")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.filtrBajoLabel")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.filtroMedio)}
                        value={form.alrtFiltrBajo}
                        onChange={(e) => setForm({ ...form, alrtFiltrBajo: e.target.value })}
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.filtrBajo")}</p>
                  </div>
                </div>
              </div>

              {/* Section: Umbrales de bateria */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("umbrales.sections.bateria")}
                </p>
                <div className="umbrales-form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.bateAltoLabel")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.bateAlto)}
                        value={form.alrtBateAlto}
                        onChange={(e) => setForm({ ...form, alrtBateAlto: e.target.value })}
                        style={{ paddingRight: "2rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateAlto")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.bateMedioLabel")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.bateMedio)}
                        value={form.alrtBateMedio}
                        onChange={(e) => setForm({ ...form, alrtBateMedio: e.target.value })}
                        style={{ paddingRight: "2rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateMedio")}</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {t("umbrales.fields.bateBajoLabel")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.bateBajo)}
                        value={form.alrtBateBajo}
                        onChange={(e) => setForm({ ...form, alrtBateBajo: e.target.value })}
                        style={{ paddingRight: "2rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.bateBajo")}</p>
                  </div>
                </div>
              </div>

              {/* Section: Ajuste */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("umbrales.sections.ajuste")}
                </p>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                    {t("umbrales.fields.ajusteUmbral")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input-field"
                      type="number"
                      step="any"
                      placeholder={String(DEFAULT_THRESHOLDS.ajuste)}
                      value={form.alrtAjus}
                      onChange={(e) => setForm({ ...form, alrtAjus: e.target.value })}
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                  </div>
                  <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{t("umbrales.help.ajuste")}</p>
                </div>
              </div>

              <div className="umbrales-modal-actions" style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  {t("common.cancel")}
                </button>
                <button type="button" onClick={fillDefaults} className="btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                  <RotateCcw size={14} /> {t("umbrales.defaultValuesBtn")}
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {editando ? t("common.update") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 1024px) {
          .umbrales-table-wrap {
            overflow-x: auto !important;
          }
          .umbrales-form-grid-3 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .umbrales-header {
            flex-wrap: wrap !important;
            gap: 0.75rem !important;
            margin-bottom: 1rem !important;
          }
          .umbrales-title {
            font-size: 1.25rem !important;
          }
          .umbrales-header-actions {
            width: 100% !important;
            flex-wrap: wrap !important;
          }
          .umbrales-table-wrap {
            overflow-x: auto !important;
          }
          .umbrales-form-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .umbrales-form-grid-3 {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .modal-umbrales {
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 1rem !important;
          }
          .umbrales-modal-actions {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
