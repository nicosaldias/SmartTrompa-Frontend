"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/api/client";
import type { AlertasUmbrales, Trabajador } from "@/types";
import Swal from "sweetalert2";
import { Search, Plus, Pencil, Trash2, Sliders } from "lucide-react";

export default function UmbralesClient() {
  const [umbrales, setUmbrales] = useState<AlertasUmbrales[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<AlertasUmbrales | null>(null);
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
        u.rutTrabajador?.toLowerCase().includes(q) ||
        u.trabajador?.nombre?.toLowerCase().includes(q) ||
        u.trabajador?.apellidoPaterno?.toLowerCase().includes(q)
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

  const CAMPOS_UMBRAL = [
    { key: "alrtRespAlto", label: "Resp. Alto" },
    { key: "alrtRespBajo", label: "Resp. Bajo" },
    { key: "alrtAjus", label: "Ajuste" },
    { key: "alrtFiltrAlto", label: "Filtro Alto" },
    { key: "alrtFiltrBajo", label: "Filtro Bajo" },
    { key: "alrtBateAlto", label: "Bat. Alto" },
    { key: "alrtBateMedio", label: "Bat. Medio" },
    { key: "alrtBateBajo", label: "Bat. Bajo" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Gestion de Umbrales</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Configuracion de umbrales de alerta por trabajador
          </p>
        </div>
        <button className="btn-primary" onClick={abrirCrear} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={16} /> Nuevo umbral
        </button>
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
          <Sliders size={32} color="var(--color-text-secondary)" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--color-text-secondary)" }}>
            {busqueda ? "No se encontraron umbrales" : "No hay umbrales configurados"}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Trabajador
                </th>
                {CAMPOS_UMBRAL.map((c) => (
                  <th key={c.key} style={{ padding: "0.75rem 0.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.7rem", textTransform: "uppercase" }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {umbralesFiltrados.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <p style={{ fontWeight: 600 }}>
                      {u.trabajador ? `${u.trabajador.nombre} ${u.trabajador.apellidoPaterno || ""}` : u.rutTrabajador}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                      {u.rutTrabajador}
                    </p>
                  </td>
                  {CAMPOS_UMBRAL.map((c) => (
                    <td key={c.key} style={{ padding: "0.5rem", textAlign: "center" }}>
                      {u[c.key] != null ? String(u[c.key]) : "—"}
                    </td>
                  ))}
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
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

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: "100%", maxWidth: 520, padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              {editando ? "Editar umbral" : "Nuevo umbral"}
            </h2>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Trabajador select */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                  Trabajador
                </label>
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

              {/* Threshold fields in a 2-column grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {CAMPOS_UMBRAL.map((c) => (
                  <div key={c.key}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      {c.label}
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={form[c.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {editando ? "Actualizar" : "Crear"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
