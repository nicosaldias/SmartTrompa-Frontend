"use client";

import { useMemo, useState } from "react";
import { api } from "@/api/client";
import type { Empresa } from "@/types";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/types";
import { getEmpresaActivaFromCookie } from "@/utils/cookies";
import { setEmpresaActivaAction } from "@/actions/auth";

// Duplicado a propósito desde RolesUbicacionesClient: allí es un helper local
// no exportado, y extraerlo implicaría tocar un archivo de otra familia.
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
  initialEmpresas: Empresa[];
}

interface EmpresaForm {
  nombre: string;
  rutEmpresa: string;
}

export default function EmpresasClient({ initialEmpresas }: Props) {
  const t = useT();
  const [empresas, setEmpresas] = useState<Empresa[]>(initialEmpresas);
  const [busqueda, setBusqueda] = useState("");

  // Modal alta/edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>({ nombre: "", rutEmpresa: "" });

  // Filtro client-side: la lista de empresas es corta (una fila por cliente
  // de la plataforma), no amerita búsqueda en el backend.
  const empresasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return empresas;
    return empresas.filter(
      (e) =>
        e.nombre.toLowerCase().includes(term) ||
        e.rutEmpresa.toLowerCase().includes(term)
    );
  }, [empresas, busqueda]);

  async function cargarEmpresas() {
    try {
      const data = await api.empresas.list();
      setEmpresas(data);
    } catch (err) {
      console.error("Error cargando empresas:", err);
    }
  }

  /**
   * Si la empresa recién eliminada/deshabilitada es la activa en st_empresa,
   * limpia la cookie y recarga: sin esto el superadmin queda scoped a un
   * tenant fantasma (X-Empresa-Id apuntando a una empresa inválida).
   * Devuelve true si recargó (el caller no debe seguir actualizando estado).
   */
  async function sanearEmpresaActiva(empresaId: number): Promise<boolean> {
    if (getEmpresaActivaFromCookie()?.id !== empresaId) return false;
    await setEmpresaActivaAction(null);
    // Recarga completa: los Server Components deben re-fetchear sin la cookie
    // y el resto de la UI (Header, WebSocket) volver al scope global.
    window.location.reload();
    return true;
  }

  function abrirModal(empresa?: Empresa) {
    setEditando(empresa || null);
    setForm({
      nombre: empresa?.nombre || "",
      rutEmpresa: empresa?.rutEmpresa || "",
    });
    setModalOpen(true);
  }

  async function guardarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const rutEmpresa = form.rutEmpresa.trim();
    // `required` del input no cubre strings de solo espacios; validamos el trim.
    if (!nombre || !rutEmpresa) {
      Swal.fire({
        icon: "warning",
        title: t("common.error"),
        text: t("empresas.modal.requiredError"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }
    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editando ? t("empresas.confirm.update") : t("empresas.confirm.create"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("empresas.confirm.saveBtn"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;
    try {
      if (editando) {
        await api.empresas.update(editando.id, { nombre, rutEmpresa });
      } else {
        await api.empresas.create({ nombre, rutEmpresa });
      }
      setModalOpen(false);
      cargarEmpresas();
      Swal.fire({
        icon: "success",
        title: t("empresas.toast.saved"),
        timer: 1200,
        showConfirmButton: false,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
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

  async function toggleEmpresa(empresa: Empresa) {
    // Deshabilitar bloquea el login de TODOS los usuarios de la empresa:
    // siempre se confirma, y al deshabilitar se advierte explícitamente.
    const result = await Swal.fire({
      title: empresa.habilitada
        ? t("empresas.disableConfirmTitle")
        : t("empresas.enableConfirmTitle"),
      text: empresa.habilitada ? t("empresas.disableWarn") : undefined,
      icon: empresa.habilitada ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: empresa.habilitada
        ? t("empresas.disable")
        : t("empresas.enable"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: empresa.habilitada ? "#ef4444" : "#f97316",
    });
    if (!result.isConfirmed) return;
    try {
      await api.empresas.toggleHabilitada(empresa.id);
      // Al DESHABILITAR la empresa activa del superadmin, soltar el scope.
      if (empresa.habilitada && (await sanearEmpresaActiva(empresa.id))) return;
      cargarEmpresas();
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

  async function eliminarEmpresa(empresa: Empresa) {
    // Consultar relaciones ANTES de confirmar: si la empresa tiene registros
    // asociados el backend rechazará el DELETE igual (409/400), pero avisar
    // primero evita una confirmación destructiva que no puede prosperar.
    let relaciones: Record<string, number>;
    try {
      relaciones = await api.empresas.relaciones(empresa.id);
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }
    const conRegistros = Object.entries(relaciones).filter(([, n]) => n > 0);
    if (conRegistros.length > 0) {
      // Cada clave del backend se traduce vía empresas.relaciones.claves.*;
      // si llega una desconocida, t() cae al fallback (la clave cruda).
      const detalle = conRegistros
        .map(
          ([tipo, n]) =>
            `${t(`empresas.relaciones.claves.${tipo}` as TranslationKey, undefined, tipo)}: ${n}`
        )
        .join(", ");
      Swal.fire({
        icon: "warning",
        title: t("empresas.relaciones.title"),
        text: `${t("empresas.relaciones.text")} (${detalle})`,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }
    const result = await Swal.fire({
      title: t("empresas.delete.title"),
      text: t("empresas.delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("empresas.delete.confirmBtn"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await api.empresas.delete(empresa.id);
      // Si se eliminó la empresa activa del superadmin, soltar el scope.
      if (await sanearEmpresaActiva(empresa.id)) return;
      cargarEmpresas();
    } catch (err: unknown) {
      // Carrera posible: alguien creó registros entre relaciones() y delete().
      // El backend responde 409/400 y mostramos su mensaje tal cual.
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  const thStyle: React.CSSProperties = {
    padding: "0.75rem",
    textAlign: "left",
    color: "var(--color-text-secondary)",
    fontWeight: 600,
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
  };

  return (
    <div className="empresas-root">
      {/* Header */}
      <div
        className="empresas-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="empresas-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            {t("empresas.title")}
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {t("empresas.subtitle")}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => abrirModal()}
          style={{ fontSize: "0.8rem", padding: "0.375rem 0.75rem" }}
        >
          {t("empresas.addBtn")}
        </button>
      </div>

      {/* Tabla */}
      <div className="card empresas-panel">
        <div style={{ marginBottom: "1rem", maxWidth: 360 }}>
          <input
            className="input-field"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("empresas.searchPlaceholder")}
          />
        </div>

        {empresasFiltradas.length === 0 ? (
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            {t("empresas.empty")}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th style={thStyle}>{t("empresas.tableNombre")}</th>
                  <th style={thStyle}>{t("empresas.tableRut")}</th>
                  <th style={thStyle}>{t("empresas.tableEstado")}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>
                    {t("empresas.tableActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {empresasFiltradas.map((empresa) => (
                  <tr
                    key={empresa.id}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td style={{ padding: "0.75rem", fontWeight: 600 }}>
                      {empresa.nombre}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--color-text-secondary)" }}>
                      {empresa.rutEmpresa}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.125rem 0.625rem",
                          borderRadius: "9999px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          backgroundColor: empresa.habilitada
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(107,114,128,0.2)",
                          color: empresa.habilitada ? "#22c55e" : "#9ca3af",
                        }}
                      >
                        {empresa.habilitada
                          ? t("empresas.habilitada")
                          : t("empresas.deshabilitada")}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div
                        className="empresas-row-actions"
                        style={{
                          display: "flex",
                          gap: "0.375rem",
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="btn-secondary"
                          onClick={() => toggleEmpresa(empresa)}
                          title={
                            empresa.habilitada
                              ? t("empresas.disable")
                              : t("empresas.enable")
                          }
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          {empresa.habilitada
                            ? t("empresas.disable")
                            : t("empresas.enable")}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => abrirModal(empresa)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => eliminarEmpresa(empresa)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal alta/edición */}
      {modalOpen && (
        <div
          className="empresas-modal-overlay"
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
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="card modal-content empresas-modal" style={{ width: "100%", maxWidth: 560 }}>
            <h2 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>
              {editando
                ? t("empresas.modal.editTitle")
                : t("empresas.modal.newTitle")}
            </h2>
            <form
              onSubmit={guardarEmpresa}
              style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
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
                  {t("empresas.modal.nombreLabel")}
                </label>
                <input
                  className="input-field"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  maxLength={100}
                  placeholder={t("empresas.modal.nombrePlaceholder")}
                />
                <CharCounter current={form.nombre.length} max={100} />
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
                  {t("empresas.modal.rutLabel")}
                </label>
                <input
                  className="input-field"
                  value={form.rutEmpresa}
                  onChange={(e) => setForm({ ...form, rutEmpresa: e.target.value })}
                  required
                  maxLength={20}
                  placeholder={t("empresas.modal.rutPlaceholder")}
                />
                <CharCounter current={form.rutEmpresa.length} max={20} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setModalOpen(false)}
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
        @media (max-width: 768px) {
          .empresas-header {
            margin-bottom: 1.25rem !important;
          }
          .empresas-title {
            font-size: 1.25rem !important;
          }
          .empresas-modal-overlay {
            padding: 0.5rem !important;
          }
          .empresas-modal {
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
