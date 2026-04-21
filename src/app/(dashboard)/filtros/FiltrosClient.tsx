"use client";

import { useState, useMemo } from "react";
import { api } from "@/api/client";
import { TipoFiltro, TipoRespirador } from "@/types";
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, Upload } from "lucide-react";
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
  initialFiltros: TipoFiltro[];
  initialRespiradores: TipoRespirador[];
}

type ActiveTab = "filtros" | "respiradores";

interface FormState {
  marca: string;
  modelo: string;
  descripcion: string;
  fechaHomologacion: string;
}

const EMPTY_FORM: FormState = {
  marca: "",
  modelo: "",
  descripcion: "",
  fechaHomologacion: "",
};

export default function FiltrosClient({ initialFiltros, initialRespiradores }: Props) {
  const [filtros, setFiltros] = useState<TipoFiltro[]>(initialFiltros);
  const [respiradores, setRespiradores] = useState<TipoRespirador[]>(initialRespiradores);
  const [activeTab, setActiveTab] = useState<ActiveTab>("filtros");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TipoFiltro | TipoRespirador | null>(null);
  const [modalTab, setModalTab] = useState<ActiveTab>("filtros");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");


  const currentItems = activeTab === "filtros" ? filtros : respiradores;

  const stats = useMemo(() => {
    const activos = currentItems.filter((i) => i.habilitado).length;
    const inactivos = currentItems.filter((i) => !i.habilitado).length;
    return { activos, inactivos };
  }, [currentItems]);

  async function refreshLists() {
    try {
      const [newFiltros, newRespiradores] = await Promise.all([
        api.tipoFiltros.listWithImages(),
        api.tipoRespiradores.listWithImages(),
      ]);
      setFiltros(newFiltros);
      setRespiradores(newRespiradores);
    } catch (err) {
      console.error("Error recargando datos", err);
    }
  }

  function openCreate(tab: ActiveTab) {
    setEditingItem(null);
    setModalTab(tab);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview("");
    setShowModal(true);
  }

  function openEdit(item: TipoFiltro | TipoRespirador) {
    setEditingItem(item);
    setModalTab(activeTab);
    setForm({
      marca: item.marca || "",
      modelo: item.modelo || "",
      descripcion: item.descripcion || "",
      fechaHomologacion: item.fechaHomologacion || "",
    });
    setImageFile(null);
    setImagePreview("");
    setShowModal(true);
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const FIELD_LIMITS = { marca: 100, modelo: 100, descripcion: 255 };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      Swal.fire({ icon: "warning", title: "Formato no soportado", text: "Solo se aceptan JPG, PNG y WebP", background: "#1c2333", color: "#e6edf3" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ icon: "warning", title: "Archivo muy grande", text: "El tamaño máximo es 5 MB", background: "#1c2333", color: "#e6edf3" });
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const confirmResult = await Swal.fire({
      title: "Confirmar",
      text: editingItem ? "Se actualizara el registro" : "Se creara el registro",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, guardar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;

    // Validate image is provided
    if (!editingItem && !imageFile) {
      Swal.fire({
        icon: "warning",
        title: "Imagen requerida",
        text: "Debes subir una imagen del equipo antes de guardar",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }
    if (editingItem && !editingItem.imagen && !imageFile) {
      Swal.fire({
        icon: "warning",
        title: "Imagen requerida",
        text: "Debes subir una imagen del equipo antes de guardar",
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }

    try {
      const formData = new FormData();
      const jsonKey = modalTab === "filtros" ? "tipoFiltro" : "tipoRespirador";
      const payload: Record<string, unknown> = {
        marca: form.marca,
        modelo: form.modelo,
        descripcion: form.descripcion,
        fechaHomologacion: form.fechaHomologacion || null,
        habilitado: editingItem ? editingItem.habilitado : true,
      };
      formData.append(jsonKey, JSON.stringify(payload));
      if (imageFile) {
        formData.append("imagen", imageFile);
      }

      if (editingItem) {
        if (modalTab === "filtros") {
          await api.tipoFiltros.update(editingItem.id, formData);
        } else {
          await api.tipoRespiradores.update(editingItem.id, formData);
        }
      } else {
        if (modalTab === "filtros") {
          await api.tipoFiltros.create(formData);
        } else {
          await api.tipoRespiradores.create(formData);
        }
      }

      setShowModal(false);
      await refreshLists();
      Swal.fire({
        icon: "success",
        title: editingItem ? "Actualizado" : "Creado",
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

  async function handleToggleHabilitado(item: TipoFiltro | TipoRespirador) {
    const result = await Swal.fire({
      title: item.habilitado ? "Deshabilitar?" : "Habilitar?",
      text: item.habilitado
        ? "El elemento sera deshabilitado"
        : "El elemento sera habilitado nuevamente",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: item.habilitado ? "Si, deshabilitar" : "Si, habilitar",
      cancelButtonText: "Cancelar",
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: item.habilitado ? "#ef4444" : "#22c55e",
    });
    if (result.isConfirmed) {
      try {
        if (activeTab === "filtros") {
          await api.tipoFiltros.toggleHabilitado(item.id);
        } else {
          await api.tipoRespiradores.toggleHabilitado(item.id);
        }
        await refreshLists();
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

  async function handleDelete(item: TipoFiltro | TipoRespirador) {
    const label = activeTab === "filtros" ? "filtro" : "respirador";
    const result = await Swal.fire({
      title: `Eliminar ${label}?`,
      text: `Se eliminara permanentemente "${item.nombre || item.marca + " " + item.modelo}"`,
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
        if (activeTab === "filtros") {
          await api.tipoFiltros.delete(item.id);
        } else {
          await api.tipoRespiradores.delete(item.id);
        }
        await refreshLists();
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

  function getDisplayName(item: TipoFiltro | TipoRespirador): string {
    if (item.nombre) return item.nombre;
    return `${item.marca} ${item.modelo}`.trim();
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return "Sin fecha";
    try {
      return new Date(dateStr).toLocaleDateString("es-CL", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
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
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Filtros y Respiradores</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Gestiona los equipos de proteccion respiratoria
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-primary"
            onClick={() => openCreate("filtros")}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus size={16} /> Agregar filtro
          </button>
          <button
            className="btn-secondary"
            onClick={() => openCreate("respiradores")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderColor: "var(--color-accent)",
              color: "var(--color-accent)",
            }}
          >
            <Plus size={16} /> Agregar respirador
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "1.5rem",
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "0.5rem",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        {(["filtros", "respiradores"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              backgroundColor:
                activeTab === tab ? "var(--color-accent)" : "transparent",
              color: activeTab === tab ? "white" : "var(--color-text-secondary)",
              transition: "all 0.15s",
              textTransform: "uppercase",
              letterSpacing: "0.025em",
            }}
          >
            {tab === "filtros" ? "Filtros" : "Respiradores"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--color-green)",
            }}
          />
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Activos:
          </span>
          <span style={{ fontWeight: 700, fontSize: "1.125rem" }}>{stats.activos}</span>
        </div>
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--color-red)",
            }}
          />
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Inactivos:
          </span>
          <span style={{ fontWeight: 700, fontSize: "1.125rem" }}>{stats.inactivos}</span>
        </div>
      </div>

      {/* Grid */}
      {currentItems.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--color-text-secondary)",
          }}
        >
          No hay {activeTab === "filtros" ? "filtros" : "respiradores"} registrados
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{ padding: 0, overflow: "hidden", position: "relative" }}
            >
              {/* Image area */}
              <div
                style={{
                  height: 180,
                  backgroundColor: "var(--color-bg-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {item.imagen && typeof item.imagen === "string" && item.imagen.length > 0 ? (
                  <img
                    src={`data:image/png;base64,${item.imagen}`}
                    alt={getDisplayName(item)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <ImageIcon size={48} color="var(--color-border)" />
                )}

                {/* Status badge overlay */}
                <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
                  <span className={item.habilitado ? "badge-green" : "badge-red"}>
                    {item.habilitado ? "ACTIVO" : "INACTIVO"}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "1.25rem" }}>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
                  {getDisplayName(item)}
                </h3>
                {item.nombre && (item.marca || item.modelo) && (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {item.marca} {item.modelo}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Homologacion: {formatDate(item.fechaHomologacion)}
                </p>
                {item.descripcion && (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.descripcion}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button
                    onClick={() => openEdit(item)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      padding: "0.375rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => handleToggleHabilitado(item)}
                    className="btn-secondary"
                    style={{
                      padding: "0.375rem 0.625rem",
                      borderColor: item.habilitado
                        ? "rgba(239,68,68,0.3)"
                        : "rgba(34,197,94,0.3)",
                      color: item.habilitado ? "#ef4444" : "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                    title={item.habilitado ? "Deshabilitar" : "Habilitar"}
                  >
                    {item.habilitado ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="btn-secondary"
                    style={{
                      padding: "0.375rem",
                      borderColor: "rgba(239,68,68,0.3)",
                      color: "#ef4444",
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
              {editingItem
                ? `Editar ${modalTab === "filtros" ? "Filtro" : "Respirador"}`
                : `Nuevo ${modalTab === "filtros" ? "Filtro" : "Respirador"}`}
            </h2>
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Image upload zone - centered at top */}
              <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                <div
                  style={{
                    width: 160,
                    height: 120,
                    borderRadius: "0.75rem",
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
                  onClick={() => document.getElementById("filtro-imagen-input")?.click()}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f97316"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  id="filtro-imagen-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)" }}>
                  JPG, PNG o WebP · Max. 5 MB
                </p>
              </div>

              {/* Section: Informacion del equipo */}
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
                  Informacion del equipo
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Marca | Modelo */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>Marca</label>
                      <input
                        className="input-field"
                        type="text"
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        required
                        maxLength={FIELD_LIMITS.marca}
                      />
                      <CharCounter current={form.marca.length} max={FIELD_LIMITS.marca} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>Modelo</label>
                      <input
                        className="input-field"
                        type="text"
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        required
                        maxLength={FIELD_LIMITS.modelo}
                      />
                      <CharCounter current={form.modelo.length} max={FIELD_LIMITS.modelo} />
                    </div>
                  </div>

                  {/* Fecha Homologacion */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                      Fecha de Homologacion
                    </label>
                    <input
                      className="input-field"
                      type="date"
                      value={form.fechaHomologacion}
                      onChange={(e) => setForm({ ...form, fechaHomologacion: e.target.value })}
                    />
                  </div>

                  {/* Descripcion - full width */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>Descripcion</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      maxLength={FIELD_LIMITS.descripcion}
                      style={{ resize: "vertical" }}
                    />
                    <CharCounter current={form.descripcion.length} max={FIELD_LIMITS.descripcion} />
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
