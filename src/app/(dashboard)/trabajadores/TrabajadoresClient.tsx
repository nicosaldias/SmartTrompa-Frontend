"use client";

import { useState, useMemo } from "react";
import { api } from "@/api/client";
import { Trabajador, TrabajadorRequest, Cargo, PageResponse } from "@/types";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Upload } from "lucide-react";
import Swal from "sweetalert2";

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
  initialPage: PageResponse<Trabajador>;
}

const CARGOS: Cargo[] = ["Administrador", "Supervisor", "Trabajador"];

const CARGO_BADGE: Record<Cargo, string> = {
  Administrador: "badge-blue",
  Supervisor: "badge-yellow",
  Trabajador: "badge-gray",
};

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, "").toLowerCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

function cleanRut(formatted: string): string {
  return formatted.replace(/[.\-]/g, "");
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

const PAGE_SIZE = 20;

export default function TrabajadoresClient({ initialPage }: Props) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialPage.content);
  const [totalElements, setTotalElements] = useState(initialPage.totalElements);
  const [totalPages, setTotalPages] = useState(initialPage.totalPages);
  const [currentPage, setCurrentPage] = useState(initialPage.number);
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<Cargo | "">("");
  const [soloActivos, setSoloActivos] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);

  // Form fields
  const [formRut, setFormRut] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formApellidoPaterno, setFormApellidoPaterno] = useState("");
  const [formApellidoMaterno, setFormApellidoMaterno] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formCargo, setFormCargo] = useState<Cargo>("Trabajador");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function getFieldError(field: string, value: string): string | null {
    if (!touched[field]) return null;
    switch (field) {
      case "rut": return value.length < 3 ? "RUT invalido" : null;
      case "nombre": return !value.trim() ? "Nombre es obligatorio" : null;
      case "apellidoPaterno": return !value.trim() ? "Apellido es obligatorio" : null;
      case "correo": return value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Correo invalido" : null;
      case "password": return value && value.length < 6 ? "Minimo 6 caracteres" : null;
      default: return null;
    }
  }

  async function fetchPage(page: number) {
    try {
      const data = await api.trabajadores.listPaged(page, PAGE_SIZE);
      setTrabajadores(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setCurrentPage(data.number);
    } catch (err) {
      console.error("Error cargando trabajadores", err);
    }
  }

  async function refreshList() {
    await fetchPage(currentPage);
  }

  function handlePageChange(page: number) {
    fetchPage(page);
  }

  // Client-side filtering on current page data
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return trabajadores.filter((t) => {
      if (soloActivos && !t.activo) return false;
      if (cargoFilter && t.cargo !== cargoFilter) return false;
      if (term) {
        const fullName = `${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`.toLowerCase();
        const rut = t.rut.toLowerCase();
        const correo = t.correo.toLowerCase();
        if (!fullName.includes(term) && !rut.includes(term) && !correo.includes(term)) return false;
      }
      return true;
    });
  }, [trabajadores, search, cargoFilter, soloActivos]);

  const paginated = filtered;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Error", text: "La imagen no puede superar los 5 MB", background: "#1c2333", color: "#e6edf3" });
      return;
    }
    setFormImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function openCreate() {
    setEditingTrabajador(null);
    setFormRut("");
    setFormNombre("");
    setFormApellidoPaterno("");
    setFormApellidoMaterno("");
    setFormCorreo("");
    setFormCargo("Trabajador");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormImageFile(null);
    setFormImagePreview(null);
    setTouched({});
    setShowModal(true);
  }

  function openEdit(t: Trabajador) {
    setEditingTrabajador(t);
    setFormRut(formatRut(t.rut));
    setFormNombre(t.nombre);
    setFormApellidoPaterno(t.apellidoPaterno);
    setFormApellidoMaterno(t.apellidoMaterno);
    setFormCorreo(t.correo);
    setFormCargo(t.cargo);
    setFormPassword("");
    setFormConfirmPassword("");
    if (t.tieneImagen) {
      setFormImagePreview(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/trabajador/${t.rut}/imagen/`);
    } else {
      setFormImagePreview(null);
    }
    setFormImageFile(null);
    setTouched({});
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (formPassword && formPassword !== formConfirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Las contrasenas no coinciden",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Confirmar",
      text: editingTrabajador ? "Se actualizara el registro" : "Se creara el registro",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, guardar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;

    try {
      if (editingTrabajador) {
        const updateData: Partial<TrabajadorRequest> = {
          nombre: formNombre,
          apellidoPaterno: formApellidoPaterno,
          apellidoMaterno: formApellidoMaterno,
          correo: formCorreo,
          cargo: formCargo,
          ...(formPassword ? { password: formPassword } : {}),
        };
        await api.trabajadores.update(editingTrabajador.rut, updateData, formImageFile || undefined);
      } else {
        const createData: TrabajadorRequest = {
          rut: formRut,
          nombre: formNombre,
          apellidoPaterno: formApellidoPaterno,
          apellidoMaterno: formApellidoMaterno,
          correo: formCorreo,
          cargo: formCargo,
          password: formPassword,
        };
        await api.trabajadores.create(createData, formImageFile || undefined);
      }
      setShowModal(false);
      await refreshList();
      Swal.fire({
        icon: "success",
        title: editingTrabajador ? "Trabajador actualizado" : "Trabajador creado",
        timer: 1500,
        showConfirmButton: false,
        background: "#1c2333",
        color: "#e6edf3",
      });
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

  async function handleToggleActivo(t: Trabajador) {
    const result = await Swal.fire({
      title: t.activo ? "Desactivar trabajador?" : "Activar trabajador?",
      text: t.activo
        ? "El trabajador no podra iniciar sesion"
        : "El trabajador podra iniciar sesion nuevamente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t.activo ? "Si, desactivar" : "Si, activar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: t.activo ? "#ef4444" : "#22c55e",
    });
    if (result.isConfirmed) {
      try {
        await api.trabajadores.toggleActivo(t.rut);
        await refreshList();
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
  }

  async function handleDelete(t: Trabajador) {
    const result = await Swal.fire({
      title: "Eliminar trabajador?",
      text: `Se eliminara permanentemente a ${t.nombre} ${t.apellidoPaterno}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      try {
        await api.trabajadores.delete(t.rut);
        await refreshList();
        Swal.fire({
          icon: "success",
          title: "Eliminado",
          timer: 1500,
          showConfirmButton: false,
          background: "#1c2333",
          color: "#e6edf3",
        });
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
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Gestion de Trabajadores</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Administra los trabajadores del sistema
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> Nuevo trabajador
        </button>
      </div>

      {/* Filters row */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-secondary)",
            }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Buscar por nombre, RUT o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Cargo filter */}
        <select
          className="input-field"
          style={{ width: 180 }}
          value={cargoFilter}
          onChange={(e) => setCargoFilter(e.target.value as Cargo | "")}
        >
          <option value="">Todos los cargos</option>
          {CARGOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Solo activos toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <div
            onClick={() => setSoloActivos(!soloActivos)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              backgroundColor: soloActivos ? "var(--color-accent)" : "var(--color-border)",
              position: "relative",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "white",
                position: "absolute",
                top: 2,
                left: soloActivos ? 18 : 2,
                transition: "left 0.2s",
              }}
            />
          </div>
          Solo activos
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["TRABAJADOR", "CARGO", "CONTACTO", "ESTADO", "ACCIONES"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 0.5rem",
                      textAlign: h === "TRABAJADOR" ? "left" : "center",
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "2.5rem",
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    No se encontraron trabajadores
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr
                    key={t.rut}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.03)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {/* TRABAJADOR column: avatar + name + rut */}
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {t.tieneImagen ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/trabajador/${t.rut}/imagen/`}
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
                            {getInitials(t.nombre, t.apellidoPaterno)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {t.nombre} {t.apellidoPaterno} {t.apellidoMaterno}
                          </div>
                          <div
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "0.8rem",
                              marginTop: "0.125rem",
                            }}
                          >
                            {formatRut(t.rut)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CARGO */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <span className={CARGO_BADGE[t.cargo]}>{t.cargo}</span>
                    </td>

                    {/* CONTACTO */}
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        textAlign: "center",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {t.correo}
                    </td>

                    {/* ESTADO */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <span className={t.activo ? "badge-green" : "badge-red"}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                        <button
                          onClick={() => openEdit(t)}
                          className="btn-secondary"
                          style={{ padding: "0.375rem" }}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(t)}
                          className="btn-secondary"
                          style={{
                            padding: "0.375rem",
                            borderColor: t.activo
                              ? "rgba(239,68,68,0.3)"
                              : "rgba(34,197,94,0.3)",
                            color: t.activo ? "#ef4444" : "#22c55e",
                          }}
                          title={t.activo ? "Desactivar" : "Activar"}
                        >
                          {t.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="btn-secondary"
                          style={{
                            padding: "0.375rem",
                            borderColor: "rgba(239,68,68,0.3)",
                            color: "#ef4444",
                          }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--color-border)",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
            }}
          >
            <span>
              Mostrando {currentPage * PAGE_SIZE + 1} -{" "}
              {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} de {totalElements}
            </span>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button
                className="btn-secondary"
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.8rem" }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.8rem",
                    borderRadius: "0.375rem",
                    border:
                      page === currentPage
                        ? "1px solid var(--color-accent)"
                        : "1px solid var(--color-border)",
                    backgroundColor:
                      page === currentPage ? "rgba(249,115,22,0.15)" : "transparent",
                    color:
                      page === currentPage
                        ? "var(--color-accent)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontWeight: page === currentPage ? 600 : 400,
                  }}
                >
                  {page + 1}
                </button>
              ))}
              <button
                className="btn-secondary"
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.8rem" }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
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
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="card modal-content"
            style={{ width: "100%", maxWidth: 960, maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
              {editingTrabajador ? "Editar Trabajador" : "Nuevo Trabajador"}
            </h2>
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Profile image upload zone */}
              <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    margin: "0 auto 0.75rem",
                    overflow: "hidden",
                    border: "2px dashed var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--color-bg-primary)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "border-color 0.2s",
                  }}
                  onClick={() => document.getElementById("trabajador-imagen-input")?.click()}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f97316"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  {formImagePreview ? (
                    <>
                      <img src={formImagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{
                        position: "absolute", inset: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                      >
                        <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 600 }}>Cambiar</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "0.5rem" }}>
                      <Upload size={24} color="var(--color-text-secondary)" style={{ margin: "0 auto 0.375rem" }} />
                      <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        Subir imagen
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="trabajador-imagen-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)" }}>
                  JPG, PNG o WebP · Max. 5 MB
                </p>
              </div>

              {/* Section: Datos personales */}
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
                  Datos personales
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* RUT - full width */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      RUT
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="12.345.678-9"
                      value={formRut}
                      onChange={(e) => setFormRut(formatRut(e.target.value))}
                      onBlur={() => setTouched(prev => ({ ...prev, rut: true }))}
                      disabled={!!editingTrabajador}
                      required
                      maxLength={12}
                      style={editingTrabajador ? { opacity: 0.6, cursor: "not-allowed" } : { borderColor: getFieldError("rut", cleanRut(formRut)) ? "#ef4444" : undefined }}
                    />
                    <CharCounter current={cleanRut(formRut).length} max={12} />
                    {getFieldError("rut", cleanRut(formRut)) && (
                      <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                        {getFieldError("rut", cleanRut(formRut))}
                      </span>
                    )}
                  </div>

                  {/* Nombre | Apellido Paterno */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Nombre
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, nombre: true }))}
                        required
                        maxLength={100}
                        style={{ borderColor: getFieldError("nombre", formNombre) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formNombre.length} max={100} />
                      {getFieldError("nombre", formNombre) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("nombre", formNombre)}
                        </span>
                      )}
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
                        Apellido Paterno
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formApellidoPaterno}
                        onChange={(e) => setFormApellidoPaterno(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, apellidoPaterno: true }))}
                        required
                        maxLength={100}
                        style={{ borderColor: getFieldError("apellidoPaterno", formApellidoPaterno) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formApellidoPaterno.length} max={100} />
                      {getFieldError("apellidoPaterno", formApellidoPaterno) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("apellidoPaterno", formApellidoPaterno)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Apellido Materno | Correo */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Apellido Materno
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formApellidoMaterno}
                        onChange={(e) => setFormApellidoMaterno(e.target.value)}
                        required
                        maxLength={100}
                      />
                      <CharCounter current={formApellidoMaterno.length} max={100} />
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
                        Correo
                      </label>
                      <input
                        className="input-field"
                        type="email"
                        value={formCorreo}
                        onChange={(e) => setFormCorreo(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, correo: true }))}
                        required
                        maxLength={150}
                        style={{ borderColor: getFieldError("correo", formCorreo) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formCorreo.length} max={150} />
                      {getFieldError("correo", formCorreo) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("correo", formCorreo)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Acceso */}
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
                  Acceso
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Cargo - full width */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Cargo
                    </label>
                    <select
                      className="input-field"
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value as Cargo)}
                    >
                      {CARGOS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contrasena | Confirmar contrasena */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Contrasena
                      </label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder={editingTrabajador ? "Dejar en blanco para no cambiar" : ""}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                        required={!editingTrabajador}
                        style={{ borderColor: getFieldError("password", formPassword) ? "#ef4444" : undefined }}
                      />
                      {getFieldError("password", formPassword) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("password", formPassword)}
                        </span>
                      )}
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
                        Confirmar contrasena
                      </label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder={editingTrabajador ? "Dejar en blanco para no cambiar" : ""}
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        required={!editingTrabajador}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
