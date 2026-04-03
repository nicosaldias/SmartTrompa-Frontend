"use client";

import { useState, useMemo, useRef } from "react";
import { api } from "@/api/client";
import { TipoFiltro, TipoRespirador } from "@/types";
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, Upload } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  initialFiltros: TipoFiltro[];
  initialRespiradores: TipoRespirador[];
}

type ActiveTab = "filtros" | "respiradores";

interface FormState {
  nombre: string;
  marca: string;
  modelo: string;
  descripcion: string;
  fechaHomologacion: string;
}

const EMPTY_FORM: FormState = {
  nombre: "",
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      nombre: item.nombre || "",
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
  const FIELD_LIMITS = { nombre: 100, marca: 100, modelo: 100, descripcion: 500 };

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
    try {
      const formData = new FormData();
      const jsonKey = modalTab === "filtros" ? "tipoFiltro" : "tipoRespirador";
      const payload = {
        nombre: form.nombre,
        marca: form.marca,
        modelo: form.modelo,
        descripcion: form.descripcion,
        fechaHomologacion: form.fechaHomologacion || null,
        habilitado: editingItem ? editingItem.habilitado : true,
      };
      formData.append(jsonKey, JSON.stringify(payload));
      if (imageFile) {
        formData.append("imagen", imageFile);
      } else if (!editingItem) {
        // Backend requires imagen field — send empty blob for create
        formData.append("imagen", new Blob(), "empty.png");
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
            className="card"
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
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
              {/* Nombre */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Nombre</label>
                  <span style={{ fontSize: "0.7rem", color: form.nombre.length > FIELD_LIMITS.nombre ? "#ef4444" : "var(--color-text-secondary)" }}>
                    {form.nombre.length}/{FIELD_LIMITS.nombre}
                  </span>
                </div>
                <input
                  className="input-field"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value.slice(0, FIELD_LIMITS.nombre) })}
                  required
                />
              </div>

              {/* Marca */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Marca</label>
                  <span style={{ fontSize: "0.7rem", color: form.marca.length > FIELD_LIMITS.marca ? "#ef4444" : "var(--color-text-secondary)" }}>
                    {form.marca.length}/{FIELD_LIMITS.marca}
                  </span>
                </div>
                <input
                  className="input-field"
                  type="text"
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value.slice(0, FIELD_LIMITS.marca) })}
                  required
                />
              </div>

              {/* Modelo */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Modelo</label>
                  <span style={{ fontSize: "0.7rem", color: form.modelo.length > FIELD_LIMITS.modelo ? "#ef4444" : "var(--color-text-secondary)" }}>
                    {form.modelo.length}/{FIELD_LIMITS.modelo}
                  </span>
                </div>
                <input
                  className="input-field"
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value.slice(0, FIELD_LIMITS.modelo) })}
                  required
                />
              </div>

              {/* Descripcion */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Descripción</label>
                  <span style={{ fontSize: "0.7rem", color: form.descripcion.length > FIELD_LIMITS.descripcion ? "#ef4444" : "var(--color-text-secondary)" }}>
                    {form.descripcion.length}/{FIELD_LIMITS.descripcion}
                  </span>
                </div>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value.slice(0, FIELD_LIMITS.descripcion) })}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Fecha Homologacion */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Fecha de Homologacion
                </label>
                <input
                  className="input-field"
                  type="date"
                  value={form.fechaHomologacion}
                  onChange={(e) => setForm({ ...form, fechaHomologacion: e.target.value })}
                />
              </div>

              {/* Imagen */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Imagen
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--color-border)",
                    borderRadius: "0.5rem",
                    padding: "1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  {imagePreview ? (
                    <div>
                      <img
                        src={imagePreview}
                        alt="preview"
                        style={{
                          maxHeight: 120,
                          maxWidth: "100%",
                          borderRadius: "0.375rem",
                          marginBottom: "0.5rem",
                        }}
                      />
                      <p style={{ fontSize: "0.7rem", color: "var(--color-accent)" }}>
                        Clic para cambiar imagen
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <Upload
                        size={24}
                        style={{ margin: "0 auto 0.5rem", display: "block" }}
                      />
                      Haz clic para seleccionar una imagen
                      <p style={{ fontSize: "0.65rem", marginTop: "0.5rem", color: "var(--color-text-secondary)", opacity: 0.7 }}>
                        Formatos: JPG, PNG, WebP — Máximo: 5 MB
                      </p>
                    </div>
                  )}
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
