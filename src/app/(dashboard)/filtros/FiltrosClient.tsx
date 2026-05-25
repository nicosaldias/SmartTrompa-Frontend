"use client";

import { useState, useMemo } from "react";
import { api } from "@/api/client";
import { TipoFiltro, TipoRespirador } from "@/types";
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, Upload } from "lucide-react";
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
  const t = useT();
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
      Swal.fire({ icon: "warning", title: t("filtros.unsupportedFormat"), text: t("filtros.acceptedFormats"), background: "#1c2333", color: "#e6edf3" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ icon: "warning", title: t("filtros.fileTooLarge"), text: t("filtros.maxFileSize"), background: "#1c2333", color: "#e6edf3" });
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editingItem ? t("filtros.recordWillBeUpdated") : t("filtros.recordWillBeCreated"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("filtros.yesSave"),
      cancelButtonText: t("common.cancel"),
      background: "#1c2333",
      color: "#e6edf3",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;

    // Validate image is provided
    if (!editingItem && !imageFile) {
      Swal.fire({
        icon: "warning",
        title: t("filtros.imageRequired"),
        text: t("filtros.imageRequiredText"),
        background: "#1c2333",
        color: "#e6edf3",
      });
      return;
    }
    if (editingItem && !editingItem.imagen && !imageFile) {
      Swal.fire({
        icon: "warning",
        title: t("filtros.imageRequired"),
        text: t("filtros.imageRequiredText"),
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
        title: editingItem ? t("filtros.updated") : t("filtros.created"),
        timer: 1500,
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

  async function handleToggleHabilitado(item: TipoFiltro | TipoRespirador) {
    const result = await Swal.fire({
      title: item.habilitado ? t("filtros.disableTitle") : t("filtros.enableTitle"),
      text: item.habilitado
        ? t("filtros.disableText")
        : t("filtros.enableText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: item.habilitado ? t("filtros.yesDisable") : t("filtros.yesEnable"),
      cancelButtonText: t("common.cancel"),
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
          title: t("common.error"),
          text: (err as Error).message,
          background: "#1c2333",
          color: "#e6edf3",
        });
      }
    }
  }

  async function handleDelete(item: TipoFiltro | TipoRespirador) {
    const result = await Swal.fire({
      title: activeTab === "filtros" ? t("filtros.deleteFilterTitle") : t("filtros.deleteRespiratorTitle"),
      text: t("filtros.deleteText", { name: item.nombre || `${item.marca} ${item.modelo}` }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("filtros.yesDelete"),
      cancelButtonText: t("common.cancel"),
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
          title: t("filtros.deleted"),
          timer: 1500,
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
  }

  function getDisplayName(item: TipoFiltro | TipoRespirador): string {
    if (item.nombre) return item.nombre;
    return `${item.marca} ${item.modelo}`.trim();
  }

  function formatDate(dateStr?: string): string {
    if (!dateStr) return t("filtros.noDate");
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
    <div className="filtros-root">
      {/* Header */}
      <div
        className="filtros-header"
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
          <h1 className="filtros-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("filtros.title")}</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {t("filtros.subtitle")}
          </p>
        </div>
        <div className="filtros-header-actions" style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-primary filtros-header-btn"
            onClick={() => openCreate("filtros")}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus size={16} /> {t("filtros.addFilter")}
          </button>
          <button
            className="btn-secondary filtros-header-btn"
            onClick={() => openCreate("respiradores")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderColor: "var(--color-accent)",
              color: "var(--color-accent)",
            }}
          >
            <Plus size={16} /> {t("filtros.addRespirator")}
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
            {tab === "filtros" ? t("filtros.tabFilters") : t("filtros.tabRespirators")}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="filtros-stats" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
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
            {t("filtros.statsActive")}
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
            {t("filtros.statsInactive")}
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
          {activeTab === "filtros" ? t("filtros.noFilters") : t("filtros.noRespirators")}
        </div>
      ) : (
        <div
          className="filtros-grid-tipos"
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
                    {item.habilitado ? t("filtros.badgeActive") : t("filtros.badgeInactive")}
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
                  {t("filtros.homologation")}: {formatDate(item.fechaHomologacion)}
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
                    <Pencil size={13} /> {t("common.edit")}
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
                    title={item.habilitado ? t("filtros.disable") : t("filtros.enable")}
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
                    title={t("common.delete")}
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
          className="filtros-modal-overlay"
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
            className="card modal-content filtros-modal"
            style={{ width: "100%", maxWidth: 960, maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
              {editingItem
                ? (modalTab === "filtros" ? t("filtros.editFilter") : t("filtros.editRespirator"))
                : (modalTab === "filtros" ? t("filtros.newFilter") : t("filtros.newRespirator"))}
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
                        <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 600 }}>{t("filtros.change")}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "0.5rem" }}>
                      <Upload size={24} color="var(--color-text-secondary)" style={{ margin: "0 auto 0.375rem" }} />
                      <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        {t("filtros.uploadImage")}
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
                  {t("filtros.imageFormats")}
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
                  {t("filtros.sectionEquipmentInfo")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Marca | Modelo */}
                  <div className="filtros-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>{t("filtros.brand")}</label>
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
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>{t("filtros.model")}</label>
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
                      {t("filtros.homologationDate")}
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
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>{t("filtros.description")}</label>
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
                  {t("common.cancel")}
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .filtros-grid-tipos {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
          }
          .filtros-modal {
            max-width: 90vw !important;
          }
        }
        @media (max-width: 768px) {
          .filtros-header {
            margin-bottom: 1.25rem !important;
          }
          .filtros-title {
            font-size: 1.25rem !important;
          }
          .filtros-header-actions {
            width: 100% !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          .filtros-header-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .filtros-stats {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          .filtros-grid-tipos {
            grid-template-columns: 1fr !important;
          }
          .filtros-modal-overlay {
            padding: 0.5rem !important;
          }
          .filtros-modal {
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 1rem !important;
          }
          .filtros-form-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
