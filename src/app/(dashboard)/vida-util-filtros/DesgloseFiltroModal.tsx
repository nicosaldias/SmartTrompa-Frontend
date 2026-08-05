"use client";

import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { api, ApiError } from "@/api/client";
import { API_BASE_URL } from "@/api/endpoints";
import { DesgloseFiltro } from "@/types";
import { useT } from "@/i18n/LanguageProvider";
import { X } from "lucide-react";
import { formatFecha, formatHora } from "@/utils/fechas";

interface Props {
  rut: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void; // refresca la tabla principal cuando cambia una exclusión
}

function getInitials(nombreCompleto: string): string {
  const parts = nombreCompleto.trim().split(/\s+/);
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

// Formato central es-CL: toLocaleDateString() SIN locale heredaba el del
// navegador y en un equipo en-US invertía día y mes.
function fmtDate(value: string | null): string {
  return value ? formatFecha(value) : "—";
}

function fmtTime(value: string | null): string {
  return value ? formatHora(value) : "—";
}

export default function DesgloseFiltroModal({ rut, isAdmin, onClose, onChanged }: Props) {
  const t = useT();
  const [data, setData] = useState<DesgloseFiltro | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.filterLifecycle.desglose(rut);
      setData(d);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: err instanceof ApiError ? err.message : t("vidaUtilFiltros.loadError"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [rut, t, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function handleExcluir(jornadaId: number) {
    const result = await Swal.fire({
      icon: "warning",
      title: t("vidaUtilFiltros.excludeReasonTitle"),
      input: "text",
      inputPlaceholder: t("vidaUtilFiltros.excludeReasonPlaceholder"),
      inputAttributes: { autocapitalize: "off", autocomplete: "off" },
      showCancelButton: true,
      confirmButtonText: t("vidaUtilFiltros.excludeConfirmButton"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#ef4444",
      preConfirm: (value: string) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage(t("vidaUtilFiltros.excludeReasonRequired"));
          return false;
        }
        return value.trim();
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api.filterLifecycle.excluirTanda(jornadaId, result.value as string);
      await load();
      onChanged();
      Swal.fire({
        icon: "success",
        title: t("vidaUtilFiltros.excludeSuccess"),
        timer: 1400,
        showConfirmButton: false,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: err instanceof ApiError ? err.message : "",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  async function handleReincluir(jornadaId: number) {
    try {
      await api.filterLifecycle.reincluirTanda(jornadaId);
      await load();
      onChanged();
      Swal.fire({
        icon: "success",
        title: t("vidaUtilFiltros.reincludeSuccess"),
        timer: 1400,
        showConfirmButton: false,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: err instanceof ApiError ? err.message : "",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {data?.tieneImagen ? (
              <img
                src={`${API_BASE_URL}/trabajador/${rut}/imagen/`}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              // Iniciales sobre el gradiente naranja: el blanco medía 2.80:1 contra
              // #f97316 y 3.56:1 contra #ea580c; --color-on-accent da 5.91:1 y 4.65:1.
              // El gradiente no cambia — sólo su tinta.
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-on-accent)", fontWeight: 700, flexShrink: 0 }}>
                {data ? getInitials(data.trabajadorNombre) : "?"}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{data?.trabajadorNombre ?? t("vidaUtilFiltros.modalTitle")}</h2>
              {data && (
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  {data.tipoFiltro} · {data.porcentajeUso.toFixed(0)}% ({data.horasUsadas.toFixed(1)}/{data.horasMaximas.toFixed(0)} {t("vidaUtilFiltros.hoursUnit")})
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label={t("vidaUtilFiltros.modalClose")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>…</p>
        ) : !data || data.tandas.length === 0 ? (
          <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
            {t("vidaUtilFiltros.modalNoTandas")}
          </p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>{t("vidaUtilFiltros.modalColDate")}</th>
                  <th style={{ padding: "0.5rem" }}>{t("vidaUtilFiltros.modalColStart")}</th>
                  <th style={{ padding: "0.5rem" }}>{t("vidaUtilFiltros.modalColEnd")}</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>{t("vidaUtilFiltros.modalColHours")}</th>
                  <th style={{ padding: "0.5rem" }}>{t("vidaUtilFiltros.modalColState")}</th>
                </tr>
              </thead>
              <tbody>
                {data.tandas.map((tanda) => (
                  <tr
                    key={tanda.jornadaId}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      opacity: tanda.excluida ? 0.5 : 1,
                    }}
                  >
                    <td style={{ padding: "0.5rem", textDecoration: tanda.excluida ? "line-through" : "none" }}>{fmtDate(tanda.inicio)}</td>
                    <td style={{ padding: "0.5rem" }}>{fmtTime(tanda.inicio)}</td>
                    <td style={{ padding: "0.5rem" }}>{tanda.activa ? t("vidaUtilFiltros.modalActive") : fmtTime(tanda.fin)}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>{tanda.horasReales.toFixed(1)}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {tanda.activa ? (
                        <span style={{ color: "#3b82f6", fontSize: "0.75rem", fontWeight: 600 }}>{t("vidaUtilFiltros.modalActive")}</span>
                      ) : tanda.excluida ? (
                        <span title={tanda.excluidoPor && tanda.excluidoEn ? t("vidaUtilFiltros.modalExcludedBy", { rut: tanda.excluidoPor, fecha: fmtDate(tanda.excluidoEn) }) : (tanda.motivoExclusion ?? "")} style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                          <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600 }}>{t("vidaUtilFiltros.modalExcluded")}</span>
                          {isAdmin && (
                            <button onClick={() => handleReincluir(tanda.jornadaId)} style={{ fontSize: "0.7rem", background: "none", border: "1px solid var(--color-border)", borderRadius: 6, padding: "0.15rem 0.5rem", cursor: "pointer", color: "var(--color-text-primary)" }}>
                              {t("vidaUtilFiltros.modalReinclude")}
                            </button>
                          )}
                        </span>
                      ) : isAdmin ? (
                        <button onClick={() => handleExcluir(tanda.jornadaId)} style={{ fontSize: "0.7rem", background: "none", border: "1px solid #ef4444", borderRadius: 6, padding: "0.15rem 0.5rem", cursor: "pointer", color: "#ef4444" }}>
                          {t("vidaUtilFiltros.modalExclude")}
                        </button>
                      ) : (
                        <span style={{ color: "#22c55e", fontSize: "0.75rem" }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--color-border)", fontWeight: 700 }}>
                  <td style={{ padding: "0.5rem" }} colSpan={3}>{t("vidaUtilFiltros.modalTotal")}</td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>{data.horasUsadas.toFixed(1)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
