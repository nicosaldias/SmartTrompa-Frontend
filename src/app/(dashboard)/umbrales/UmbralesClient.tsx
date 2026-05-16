"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/api/client";
import type { AlertasUmbrales, Trabajador } from "@/types";
import { DEFAULT_THRESHOLDS } from "@/utils/sensorMappings";
import Swal from "sweetalert2";
import { Search, Plus, Pencil, Trash2, RotateCcw, Users, Check } from "lucide-react";

export default function UmbralesClient() {
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

  const umbralesFiltrados = useMemo(() => {
    if (!busqueda) return umbrales;
    const q = busqueda.toLowerCase();
    return umbrales.filter(
      (u) =>
        u.rutTrabajador?.toLowerCase().includes(q)
    );
  }, [umbrales, busqueda]);

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
    const errors: string[] = [];
    const filtrAlto = form.alrtFiltrAlto ? Number(form.alrtFiltrAlto) : null;
    const filtrBajo = form.alrtFiltrBajo ? Number(form.alrtFiltrBajo) : null;
    const respAlto = form.alrtRespAlto ? Number(form.alrtRespAlto) : null;
    const respBajo = form.alrtRespBajo ? Number(form.alrtRespBajo) : null;
    const bateAlto = form.alrtBateAlto ? Number(form.alrtBateAlto) : null;
    const bateMedio = form.alrtBateMedio ? Number(form.alrtBateMedio) : null;
    const bateBajo = form.alrtBateBajo ? Number(form.alrtBateBajo) : null;

    if (filtrAlto != null && filtrBajo != null && filtrAlto >= filtrBajo) {
      errors.push("Filtro Alto (atollo critico) debe ser menor que Filtro Bajo (atollo medio) en Pa");
    }
    if (respBajo != null && respAlto != null && respBajo >= respAlto) {
      errors.push("Resp. Bajo debe ser menor que Resp. Alto en bpm");
    }
    if (bateAlto != null && bateMedio != null && bateAlto >= bateMedio) {
      errors.push("Bat. Alto (critico) debe ser menor que Bat. Medio (alerta) en %");
    }
    if (bateMedio != null && bateBajo != null && bateMedio >= bateBajo) {
      errors.push("Bat. Medio (alerta) debe ser menor que Bat. Bajo en %");
    }

    if (errors.length > 0) {
      await Swal.fire({
        icon: "error",
        title: "Error de validacion",
        html: errors.map((e) => `• ${e}`).join("<br/>"),
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Confirmar",
      text: editando ? "Se actualizara el registro" : "Se creara el registro",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, guardar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
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
        title: editando ? "Umbral actualizado" : "Umbral creado",
        background: "#1c2333",
        color: "#e6edf3",
        timer: 1500,
        showConfirmButton: false,
      });
      setShowForm(false);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  async function eliminar(id: number) {
    const result = await Swal.fire({
      title: "Eliminar umbral",
      text: "Esta accion no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await api.umbrales.delete(id);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
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
      alrtAjus: String(DEFAULT_THRESHOLDS.thFit),
      alrtFiltrAlto: String(DEFAULT_THRESHOLDS.thClogHigh),
      alrtFiltrBajo: String(DEFAULT_THRESHOLDS.thClogLow),
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
        title: "Sin trabajadores seleccionados",
        text: "Selecciona al menos un trabajador",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }

    // Validaciones (mismas que el form individual)
    const errors: string[] = [];
    const filtrAlto = bulkForm.alrtFiltrAlto ? Number(bulkForm.alrtFiltrAlto) : null;
    const filtrBajo = bulkForm.alrtFiltrBajo ? Number(bulkForm.alrtFiltrBajo) : null;
    const respAlto = bulkForm.alrtRespAlto ? Number(bulkForm.alrtRespAlto) : null;
    const respBajo = bulkForm.alrtRespBajo ? Number(bulkForm.alrtRespBajo) : null;
    const bateAlto = bulkForm.alrtBateAlto ? Number(bulkForm.alrtBateAlto) : null;
    const bateMedio = bulkForm.alrtBateMedio ? Number(bulkForm.alrtBateMedio) : null;
    const bateBajo = bulkForm.alrtBateBajo ? Number(bulkForm.alrtBateBajo) : null;

    if (filtrAlto != null && filtrBajo != null && filtrAlto >= filtrBajo) {
      errors.push("Filtro Alto (atollo critico) debe ser menor que Filtro Bajo (atollo medio) en Pa");
    }
    if (respBajo != null && respAlto != null && respBajo >= respAlto) {
      errors.push("Resp. Bajo debe ser menor que Resp. Alto en bpm");
    }
    if (bateAlto != null && bateMedio != null && bateAlto >= bateMedio) {
      errors.push("Bat. Alto (critico) debe ser menor que Bat. Medio (alerta) en %");
    }
    if (bateMedio != null && bateBajo != null && bateMedio >= bateBajo) {
      errors.push("Bat. Medio (alerta) debe ser menor que Bat. Bajo en %");
    }

    if (errors.length > 0) {
      await Swal.fire({
        icon: "error",
        title: "Error de validacion",
        html: errors.map((e) => `• ${e}`).join("<br/>"),
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Configuracion masiva",
      html: `Se aplicaran los umbrales a <b>${selectedRuts.length}</b> trabajador(es).<br/>Si ya tienen umbrales configurados, se actualizaran.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, aplicar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
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
        title: "Umbrales aplicados",
        text: `Se configuraron umbrales para ${selectedRuts.length} trabajador(es)`,
        background: "#1c2333",
        color: "#e6edf3",
        timer: 2000,
        showConfirmButton: false,
      });
      setShowBulkForm(false);
      cargarDatos();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  const CAMPOS_UMBRAL = [
    { key: "alrtRespAlto", label: "Resp. Alto", unit: "bpm", defaultVal: DEFAULT_THRESHOLDS.respAlto, help: "Frecuencia respiratoria alta" },
    { key: "alrtRespBajo", label: "Resp. Bajo", unit: "bpm", defaultVal: DEFAULT_THRESHOLDS.respBajo, help: "Frecuencia respiratoria baja" },
    { key: "alrtAjus", label: "Ajuste", unit: "Pa", defaultVal: DEFAULT_THRESHOLDS.thFit, help: "Presion sobre la cual el respirador se considera desajustado" },
    { key: "alrtFiltrAlto", label: "Filtro Alto", unit: "Pa", defaultVal: DEFAULT_THRESHOLDS.thClogHigh, help: "Presion bajo la cual se detecta atollo critico" },
    { key: "alrtFiltrBajo", label: "Filtro Bajo", unit: "Pa", defaultVal: DEFAULT_THRESHOLDS.thClogLow, help: "Presion bajo la cual se detecta atollo medio" },
    { key: "alrtBateAlto", label: "Bat. Alto", unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateAlto, help: "Nivel de bateria critico" },
    { key: "alrtBateMedio", label: "Bat. Medio", unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateMedio, help: "Nivel de bateria en alerta" },
    { key: "alrtBateBajo", label: "Bat. Bajo", unit: "%", defaultVal: DEFAULT_THRESHOLDS.bateBajo, help: "Nivel de bateria bajo" },
  ] as const;

  function fillDefaults() {
    setForm({
      ...form,
      alrtRespAlto: String(DEFAULT_THRESHOLDS.respAlto),
      alrtRespBajo: String(DEFAULT_THRESHOLDS.respBajo),
      alrtAjus: String(DEFAULT_THRESHOLDS.thFit),
      alrtFiltrAlto: String(DEFAULT_THRESHOLDS.thClogHigh),
      alrtFiltrBajo: String(DEFAULT_THRESHOLDS.thClogLow),
      alrtBateAlto: String(DEFAULT_THRESHOLDS.bateAlto),
      alrtBateMedio: String(DEFAULT_THRESHOLDS.bateMedio),
      alrtBateBajo: String(DEFAULT_THRESHOLDS.bateBajo),
    });
  }

  function formatWithUnit(value: number | null | undefined, unit: string): string {
    if (value == null) return "—";
    return unit === "%" ? `${value}%` : `${value} ${unit}`;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Gestion de Umbrales</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Configuracion de umbrales de alerta por trabajador
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={abrirBulk} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={16} /> Configuracion masiva
          </button>
          <button className="btn-primary" onClick={abrirCrear} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Nuevo umbral
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: "0.75rem 1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Search size={16} color="var(--color-text-secondary)" />
          <input
            className="input-field"
            placeholder="Buscar por RUT o nombre del trabajador..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ border: "none", background: "transparent", flex: 1 }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Cargando umbrales...</p>
        </div>
      ) : umbralesFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📋</div>
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
            {busqueda ? "No se encontraron umbrales" : "No hay umbrales configurados"}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {busqueda ? "Intenta con otro termino de busqueda" : "Agrega el primer umbral usando el boton superior"}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "left", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Trabajador
                </th>
                {CAMPOS_UMBRAL.map((c) => (
                  <th key={c.key} style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {umbralesFiltrados.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <p style={{ fontWeight: 600 }}>
                      {u.rutTrabajador || "—"}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                      {u.rutTrabajador}
                    </p>
                  </td>
                  {CAMPOS_UMBRAL.map((c) => (
                    <td key={c.key} style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      {formatWithUnit(u[c.key] as number | null | undefined, c.unit)}
                    </td>
                  ))}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                      <button onClick={() => abrirEditar(u)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0.25rem" }} title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => eliminar(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.25rem" }} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal bulk */}
      {showBulkForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowBulkForm(false)}>
          <div className="card modal-content" style={{ width: "100%", maxWidth: 1100, padding: "2rem", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Configuracion masiva de umbrales
            </h2>
            <form onSubmit={guardarBulk} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Seleccion de trabajadores */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Seleccionar trabajadores ({selectedRuts.length} de {trabajadores.length})
                  </p>
                  <button type="button" onClick={selectAllTrabajadores} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.75rem", fontWeight: 600 }}>
                    {selectedRuts.length === trabajadores.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <input
                    className="input-field"
                    placeholder="Buscar trabajador por RUT o nombre..."
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
                  Umbrales de respiracion
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Resp. Alto</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.respAlto)} value={bulkForm.alrtRespAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtRespAlto: e.target.value })} style={{ paddingRight: "3rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Resp. Bajo</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.respBajo)} value={bulkForm.alrtRespBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtRespBajo: e.target.value })} style={{ paddingRight: "3rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>bpm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Umbrales de filtro */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  Umbrales de filtro
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Filtro Alto (atollo critico)</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.thClogHigh)} value={bulkForm.alrtFiltrAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtFiltrAlto: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Filtro Bajo (atollo medio)</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.thClogLow)} value={bulkForm.alrtFiltrBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtFiltrBajo: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Umbrales de bateria */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  Umbrales de bateria
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Bat. Alto (critico)</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateAlto)} value={bulkForm.alrtBateAlto} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateAlto: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Bat. Medio (alerta)</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateMedio)} value={bulkForm.alrtBateMedio} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateMedio: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Bat. Bajo</label>
                    <div style={{ position: "relative" }}>
                      <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.bateBajo)} value={bulkForm.alrtBateBajo} onChange={(e) => setBulkForm({ ...bulkForm, alrtBateBajo: e.target.value })} style={{ paddingRight: "2rem" }} />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ajuste */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem", paddingBottom: "0.375rem", borderBottom: "1px solid var(--color-border)" }}>
                  Ajuste de respirador
                </p>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Umbral de ajuste</label>
                  <div style={{ position: "relative" }}>
                    <input className="input-field" type="number" step="any" placeholder={String(DEFAULT_THRESHOLDS.thFit)} value={bulkForm.alrtAjus} onChange={(e) => setBulkForm({ ...bulkForm, alrtAjus: e.target.value })} style={{ paddingRight: "2.5rem" }} />
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowBulkForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="button" onClick={fillBulkDefaults} className="btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                  <RotateCcw size={14} /> Valores por defecto
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  Aplicar a {selectedRuts.length} trabajador(es)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div className="card modal-content" style={{ width: "100%", maxWidth: 960, padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              {editando ? "Editar umbral" : "Nuevo umbral"}
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
                  Trabajador
                </p>
                <select
                  className="input-field"
                  value={form.rutTrabajador}
                  onChange={(e) => setForm({ ...form, rutTrabajador: e.target.value })}
                  required
                  disabled={!!editando}
                >
                  <option value="">Seleccionar trabajador...</option>
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
                  Umbrales de respiracion
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Resp. Alto
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
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Frecuencia respiratoria alta</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Resp. Bajo
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
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Frecuencia respiratoria baja</p>
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
                  Umbrales de filtro
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Filtro Alto (atollo critico)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.thClogHigh)}
                        value={form.alrtFiltrAlto}
                        onChange={(e) => setForm({ ...form, alrtFiltrAlto: e.target.value })}
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Presion bajo la cual se detecta atollo critico</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Filtro Bajo (atollo medio)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={String(DEFAULT_THRESHOLDS.thClogLow)}
                        value={form.alrtFiltrBajo}
                        onChange={(e) => setForm({ ...form, alrtFiltrBajo: e.target.value })}
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Presion bajo la cual se detecta atollo medio</p>
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
                  Umbrales de bateria
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Bat. Alto (critico)
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
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Nivel de bateria critico</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Bat. Medio (alerta)
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
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Nivel de bateria en alerta</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Bat. Bajo
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
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Nivel de bateria bajo</p>
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
                  Ajuste de respirador
                </p>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                    Umbral de ajuste
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input-field"
                      type="number"
                      step="any"
                      placeholder={String(DEFAULT_THRESHOLDS.thFit)}
                      value={form.alrtAjus}
                      onChange={(e) => setForm({ ...form, alrtAjus: e.target.value })}
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--color-text-secondary)", pointerEvents: "none" }}>Pa</span>
                  </div>
                  <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Presion sobre la cual el respirador se considera desajustado</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="button" onClick={fillDefaults} className="btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                  <RotateCcw size={14} /> Valores por defecto
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {editando ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
