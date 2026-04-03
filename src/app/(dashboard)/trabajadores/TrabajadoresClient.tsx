"use client";

import { useState, useMemo } from "react";
import { api } from "@/api/client";
import { Trabajador, TrabajadorRequest, Cargo, PageResponse } from "@/types";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";

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
        await api.trabajadores.update(editingTrabajador.rut, updateData);
      } else {
        const createData: TrabajadorRequest = {
          rut: cleanRut(formRut),
          nombre: formNombre,
          apellidoPaterno: formApellidoPaterno,
          apellidoMaterno: formApellidoMaterno,
          correo: formCorreo,
          cargo: formCargo,
          password: formPassword,
        };
        await api.trabajadores.create(createData);
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
                      padding: "0.875rem 1rem",
                      textAlign: "left",
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
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: "rgba(249,115,22,0.15)",
                            color: "var(--color-accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(t.nombre, t.apellidoPaterno)}
                        </div>
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
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className={CARGO_BADGE[t.cargo]}>{t.cargo}</span>
                    </td>

                    {/* CONTACTO */}
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {t.correo}
                    </td>

                    {/* ESTADO */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className={t.activo ? "badge-green" : "badge-red"}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
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
            className="card"
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
              {editingTrabajador ? "Editar Trabajador" : "Nuevo Trabajador"}
            </h2>
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* RUT */}
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
                  disabled={!!editingTrabajador}
                  required
                  style={editingTrabajador ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                />
              </div>

              {/* Nombre */}
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
                  required
                />
              </div>

              {/* Apellido Paterno */}
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
                  required
                />
              </div>

              {/* Apellido Materno */}
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
                />
              </div>

              {/* Correo */}
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
                  required
                />
              </div>

              {/* Cargo */}
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

              {/* Password */}
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
                  required={!editingTrabajador}
                />
              </div>

              {/* Confirm Password */}
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
