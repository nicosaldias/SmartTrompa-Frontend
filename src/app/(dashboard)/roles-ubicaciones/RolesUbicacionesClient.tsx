"use client";

import { useState } from "react";
import { api } from "@/api/client";
import type { Rol, Ubicacion } from "@/types";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct >= 1 ? "#ef4444" : pct >= 0.8 ? "#f59e0b" : "var(--color-text-secondary)";
  return (
    <span style={{ display: "block", textAlign: "right", fontSize: "0.65rem", color, marginTop: "0.25rem" }}>
      {current}/{max}
    </span>
  );
}

interface Props {
  initialRoles: Rol[];
  initialUbicaciones: Ubicacion[];
}

interface RolForm {
  nombreRol: string;
  descripcion: string;
}

interface UbicacionForm {
  nombre: string;
  edificio: string;
  piso: string;
  descripcion: string;
}

export default function RolesUbicacionesClient({
  initialRoles,
  initialUbicaciones,
}: Props) {
  const t = useT();
  const [roles, setRoles] = useState<Rol[]>(initialRoles);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>(initialUbicaciones);

  // Roles modal state
  const [rolModalOpen, setRolModalOpen] = useState(false);
  const [editandoRol, setEditandoRol] = useState<Rol | null>(null);
  const [rolForm, setRolForm] = useState<RolForm>({
    nombreRol: "",
    descripcion: "",
  });

  // Ubicaciones modal state
  const [ubicacionModalOpen, setUbicacionModalOpen] = useState(false);
  const [editandoUbicacion, setEditandoUbicacion] = useState<Ubicacion | null>(
    null
  );
  const [ubicacionForm, setUbicacionForm] = useState<UbicacionForm>({
    nombre: "",
    edificio: "",
    piso: "",
    descripcion: "",
  });

  // --- Roles CRUD ---
  async function cargarRoles() {
    try {
      const data = await api.roles.list();
      setRoles(data);
    } catch (err) {
      console.error("Error cargando roles:", err);
    }
  }

  function abrirRolModal(rol?: Rol) {
    setEditandoRol(rol || null);
    setRolForm({
      nombreRol: rol?.nombreRol || "",
      descripcion: rol?.descripcion || "",
    });
    setRolModalOpen(true);
  }

  async function guardarRol(e: React.FormEvent) {
    e.preventDefault();
    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editandoRol ? t("rolesUbicaciones.confirm.update") : t("rolesUbicaciones.confirm.create"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("rolesUbicaciones.confirm.saveBtn"),
      cancelButtonText: t("common.cancel"),
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;
    try {
      if (editandoRol) {
        await api.roles.update(editandoRol.id, {
          nombreRol: rolForm.nombreRol,
          descripcion: rolForm.descripcion,
        });
      } else {
        await api.roles.create({
          nombreRol: rolForm.nombreRol,
          descripcion: rolForm.descripcion,
        });
      }
      setRolModalOpen(false);
      cargarRoles();
      Swal.fire({
        icon: "success",
        title: t("rolesUbicaciones.toast.saved"),
        timer: 1200,
        showConfirmButton: false,
        background: "#1c2333",
        color: "#e6edf3",
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  async function toggleRol(rol: Rol) {
    try {
      await api.roles.toggleHabilitado(rol.id);
      cargarRoles();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  async function eliminarRol(id: number) {
    const result = await Swal.fire({
      title: t("rolesUbicaciones.deleteRol.title"),
      text: t("rolesUbicaciones.delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("rolesUbicaciones.delete.confirmBtn"),
      cancelButtonText: t("common.cancel"),
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      try {
        await api.roles.delete(id);
        cargarRoles();
      } catch (err: unknown) {
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: (err as Error).message,
          background: "#1c2333",
          color: "#e6edf3",
        });
      }
    }
  }

  // --- Ubicaciones CRUD ---
  async function cargarUbicaciones() {
    try {
      const data = await api.ubicaciones.list();
      setUbicaciones(data);
    } catch (err) {
      console.error("Error cargando ubicaciones:", err);
    }
  }

  function abrirUbicacionModal(ubi?: Ubicacion) {
    setEditandoUbicacion(ubi || null);
    setUbicacionForm({
      nombre: ubi?.nombre || "",
      edificio: ubi?.edificio || "",
      piso: ubi?.piso?.toString() || "",
      descripcion: ubi?.descripcion || "",
    });
    setUbicacionModalOpen(true);
  }

  async function guardarUbicacion(e: React.FormEvent) {
    e.preventDefault();
    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editandoUbicacion ? t("rolesUbicaciones.confirm.update") : t("rolesUbicaciones.confirm.create"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("rolesUbicaciones.confirm.saveBtn"),
      cancelButtonText: t("common.cancel"),
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;
    try {
      const payload = {
        nombre: ubicacionForm.nombre,
        edificio: ubicacionForm.edificio || undefined,
        piso: ubicacionForm.piso ? Number(ubicacionForm.piso) : undefined,
        descripcion: ubicacionForm.descripcion || undefined,
      };
      if (editandoUbicacion) {
        await api.ubicaciones.update(editandoUbicacion.id, payload);
      } else {
        await api.ubicaciones.create(payload);
      }
      setUbicacionModalOpen(false);
      cargarUbicaciones();
      Swal.fire({
        icon: "success",
        title: t("rolesUbicaciones.toast.saved"),
        timer: 1200,
        showConfirmButton: false,
        background: "#1c2333",
        color: "#e6edf3",
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  async function toggleUbicacion(ubi: Ubicacion) {
    try {
      await api.ubicaciones.toggleHabilitado(ubi.id);
      cargarUbicaciones();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  async function eliminarUbicacion(id: number) {
    const result = await Swal.fire({
      title: t("rolesUbicaciones.deleteUbicacion.title"),
      text: t("rolesUbicaciones.delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("rolesUbicaciones.delete.confirmBtn"),
      cancelButtonText: t("common.cancel"),
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      try {
        await api.ubicaciones.delete(id);
        cargarUbicaciones();
      } catch (err: unknown) {
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: (err as Error).message,
          background: "#1c2333",
          color: "#e6edf3",
        });
      }
    }
  }

  return (
    <div className="roles-ubic-root">
      {/* Header */}
      <div className="roles-ubic-header" style={{ marginBottom: "2rem" }}>
        <h1 className="roles-ubic-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          {t("rolesUbicaciones.title")}
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
          }}
        >
          {t("rolesUbicaciones.subtitle")}
        </p>
      </div>

      {/* Two-column layout */}
      <div
        className="roles-ubic-split"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* LEFT: Roles */}
        <div className="card roles-ubic-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>
              {t("rolesUbicaciones.rolesSection")}
            </h2>
            <button
              className="btn-primary"
              onClick={() => abrirRolModal()}
              style={{
                fontSize: "0.8rem",
                padding: "0.375rem 0.75rem",
              }}
            >
              {t("rolesUbicaciones.addRolBtn")}
            </button>
          </div>

          {roles.length === 0 && (
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              {t("rolesUbicaciones.empty.roles")}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {roles.map((rol) => (
              <div
                key={rol.id}
                className="roles-ubic-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                  transition: "background-color 0.1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: rol.habilitado ? "#22c55e" : "#6b7280",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {rol.nombreRol}
                    </p>
                    {rol.descripcion && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-secondary)",
                          marginTop: "0.125rem",
                        }}
                      >
                        {rol.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <div className="roles-ubic-item-actions" style={{ display: "flex", gap: "0.375rem" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => toggleRol(rol)}
                    title={rol.habilitado ? t("rolesUbicaciones.disable") : t("rolesUbicaciones.enable")}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                    }}
                  >
                    {rol.habilitado ? t("rolesUbicaciones.deactivate") : t("rolesUbicaciones.activate")}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => abrirRolModal(rol)}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => eliminarRol(rol.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.7rem",
                      borderColor: "rgba(239,68,68,0.3)",
                      color: "#ef4444",
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Ubicaciones */}
        <div className="card roles-ubic-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>{t("rolesUbicaciones.ubicacionesSection")}</h2>
            <button
              className="btn-primary"
              onClick={() => abrirUbicacionModal()}
              style={{
                fontSize: "0.8rem",
                padding: "0.375rem 0.75rem",
              }}
            >
              {t("rolesUbicaciones.addUbicacionBtn")}
            </button>
          </div>

          {ubicaciones.length === 0 && (
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              {t("rolesUbicaciones.empty.ubicaciones")}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {ubicaciones.map((ubi) => (
              <div
                key={ubi.id}
                className="roles-ubic-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                  transition: "background-color 0.1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: ubi.habilitado ? "#22c55e" : "#6b7280",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {ubi.nombre}
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                        marginTop: "0.125rem",
                      }}
                    >
                      {[ubi.edificio, ubi.piso != null ? t("rolesUbicaciones.floorLabel", { piso: ubi.piso }) : null]
                        .filter(Boolean)
                        .join(" - ") || t("rolesUbicaciones.noDetail")}
                    </p>
                  </div>
                </div>
                <div className="roles-ubic-item-actions" style={{ display: "flex", gap: "0.375rem" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => toggleUbicacion(ubi)}
                    title={ubi.habilitado ? t("rolesUbicaciones.disable") : t("rolesUbicaciones.enable")}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                    }}
                  >
                    {ubi.habilitado ? t("rolesUbicaciones.deactivate") : t("rolesUbicaciones.activate")}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => abrirUbicacionModal(ubi)}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => eliminarUbicacion(ubi.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.7rem",
                      borderColor: "rgba(239,68,68,0.3)",
                      color: "#ef4444",
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rol Modal */}
      {rolModalOpen && (
        <div
          className="roles-ubic-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRolModalOpen(false);
          }}
        >
          <div className="card modal-content roles-ubic-modal" style={{ width: "100%", maxWidth: 780 }}>
            <h2 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>
              {editandoRol ? t("rolesUbicaciones.rolModal.editTitle") : t("rolesUbicaciones.rolModal.newTitle")}
            </h2>
            <form
              onSubmit={guardarRol}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {t("rolesUbicaciones.rolModal.nameLabel")}
                </label>
                <input
                  className="input-field"
                  value={rolForm.nombreRol}
                  onChange={(e) =>
                    setRolForm({ ...rolForm, nombreRol: e.target.value })
                  }
                  required
                  maxLength={100}
                  placeholder={t("rolesUbicaciones.rolModal.namePlaceholder")}
                />
                <CharCounter current={rolForm.nombreRol.length} max={100} />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {t("rolesUbicaciones.rolModal.descriptionLabel")}
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={rolForm.descripcion}
                  onChange={(e) =>
                    setRolForm({ ...rolForm, descripcion: e.target.value })
                  }
                  maxLength={255}
                  placeholder={t("rolesUbicaciones.rolModal.descriptionPlaceholder")}
                  style={{ resize: "vertical" }}
                />
                <CharCounter current={rolForm.descripcion.length} max={255} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setRolModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  style={{ flex: 1 }}
                >
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ubicacion Modal */}
      {ubicacionModalOpen && (
        <div
          className="roles-ubic-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setUbicacionModalOpen(false);
          }}
        >
          <div className="card modal-content roles-ubic-modal" style={{ width: "100%", maxWidth: 780 }}>
            <h2 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>
              {editandoUbicacion ? t("rolesUbicaciones.ubicacionModal.editTitle") : t("rolesUbicaciones.ubicacionModal.newTitle")}
            </h2>
            <form
              onSubmit={guardarUbicacion}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* Nombre | Edificio */}
              <div className="roles-ubic-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {t("rolesUbicaciones.ubicacionModal.nameLabel")}
                  </label>
                  <input
                    className="input-field"
                    value={ubicacionForm.nombre}
                    onChange={(e) =>
                      setUbicacionForm({ ...ubicacionForm, nombre: e.target.value })
                    }
                    required
                    maxLength={100}
                    placeholder={t("rolesUbicaciones.ubicacionModal.namePlaceholder")}
                  />
                  <CharCounter current={ubicacionForm.nombre.length} max={100} />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {t("rolesUbicaciones.ubicacionModal.buildingLabel")}
                  </label>
                  <input
                    className="input-field"
                    value={ubicacionForm.edificio}
                    onChange={(e) =>
                      setUbicacionForm({
                        ...ubicacionForm,
                        edificio: e.target.value,
                      })
                    }
                    maxLength={100}
                    placeholder={t("rolesUbicaciones.ubicacionModal.buildingPlaceholder")}
                  />
                  <CharCounter current={ubicacionForm.edificio.length} max={100} />
                </div>
              </div>

              {/* Piso (half width) */}
              <div className="roles-ubic-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {t("rolesUbicaciones.ubicacionModal.floorLabel")}
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    value={ubicacionForm.piso}
                    onChange={(e) =>
                      setUbicacionForm({ ...ubicacionForm, piso: e.target.value })
                    }
                    placeholder={t("rolesUbicaciones.ubicacionModal.floorPlaceholder")}
                  />
                </div>
                <div />
              </div>

              {/* Descripcion - full width, textarea */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {t("rolesUbicaciones.ubicacionModal.descriptionLabel")}
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={ubicacionForm.descripcion}
                  onChange={(e) =>
                    setUbicacionForm({
                      ...ubicacionForm,
                      descripcion: e.target.value,
                    })
                  }
                  maxLength={255}
                  placeholder={t("rolesUbicaciones.ubicacionModal.descriptionPlaceholder")}
                  style={{ resize: "vertical" }}
                />
                <CharCounter current={ubicacionForm.descripcion.length} max={255} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setUbicacionModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  style={{ flex: 1 }}
                >
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .roles-ubic-split {
            grid-template-columns: 1fr !important;
          }
          .roles-ubic-modal {
            max-width: 90vw !important;
          }
        }
        @media (max-width: 768px) {
          .roles-ubic-header {
            margin-bottom: 1.25rem !important;
          }
          .roles-ubic-title {
            font-size: 1.25rem !important;
          }
          .roles-ubic-split {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .roles-ubic-item {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.625rem !important;
          }
          .roles-ubic-item-actions {
            justify-content: flex-end !important;
            flex-wrap: wrap !important;
          }
          .roles-ubic-modal-overlay {
            padding: 0.5rem !important;
          }
          .roles-ubic-modal {
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 1rem !important;
          }
          .roles-ubic-form-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
