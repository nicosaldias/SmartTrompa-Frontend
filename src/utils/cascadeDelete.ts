import Swal from "sweetalert2";
import type { TranslationKey } from "@/i18n/types";
import type { TParams } from "@/i18n/LanguageProvider";
import type { RelacionesResumen } from "@/types";

type TFunc = (key: TranslationKey, params?: TParams, fallback?: string) => string;

interface CascadeDeleteArgs {
  /** Nombre visible del registro; el usuario debe escribirlo para confirmar. */
  nombre: string;
  /** Trae el conteo de relaciones para la advertencia (best-effort). */
  fetchRelaciones: () => Promise<RelacionesResumen>;
  /** Ejecuta el borrado en cascada en el backend. */
  cascadeDelete: () => Promise<void>;
  t: TFunc;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listaRelaciones(rel: RelacionesResumen | null, t: TFunc): string {
  const items: string[] = [];
  if (rel) {
    if (rel.jornadas > 0) items.push(t("cascade.relJornadas", { count: rel.jornadas }));
    if (rel.mediciones > 0) items.push(t("cascade.relMediciones", { count: rel.mediciones }));
    if (rel.alertas > 0) items.push(t("cascade.relAlertas", { count: rel.alertas }));
    if (rel.otros > 0) items.push(t("cascade.relOtros", { count: rel.otros }));
  }
  if (items.length === 0) {
    return `<p style="margin-top:.75rem">${t("cascade.relGeneric")}</p>`;
  }
  return (
    `<div style="margin-top:.75rem;text-align:left;font-size:.85rem">` +
    `<strong>${t("cascade.relationsIntro")}</strong>` +
    `<ul style="margin:.35rem 0 0 1.1rem;padding:0">` +
    items.map((i) => `<li>${escapeHtml(i)}</li>`).join("") +
    `</ul></div>`
  );
}

/**
 * Flujo de borrado destructivo con doble confirmación, para cuando el backend
 * responde 409 (el registro tiene relaciones y no se puede borrar de forma normal):
 *  1. Advertencia: no se puede borrar porque tiene registros relacionados (+ conteo).
 *  2. Disclaimer: el usuario debe escribir EXACTAMENTE el nombre para confirmar.
 *  3. Se llama al borrado en cascada.
 *
 * Devuelve true si el registro fue eliminado; false si el usuario canceló.
 */
export async function confirmCascadeDelete({
  nombre,
  fetchRelaciones,
  cascadeDelete,
  t,
}: CascadeDeleteArgs): Promise<boolean> {
  let rel: RelacionesResumen | null = null;
  try {
    rel = await fetchRelaciones();
  } catch {
    // Si el conteo falla, seguimos con una advertencia genérica.
  }

  const nombreSeguro = escapeHtml(nombre);

  const warn = await Swal.fire({
    icon: "warning",
    title: t("cascade.warnTitle"),
    html:
      `<p>${t("cascade.warnText", { name: nombreSeguro })}</p>` +
      listaRelaciones(rel, t) +
      `<p style="margin-top:.75rem">${t("cascade.warnQuestion")}</p>`,
    showCancelButton: true,
    confirmButtonText: t("cascade.warnConfirm"),
    cancelButtonText: t("common.cancel"),
    background: "var(--color-bg-card)",
    color: "var(--color-text-primary)",
    confirmButtonColor: "#ef4444",
  });
  if (!warn.isConfirmed) return false;

  const confirm = await Swal.fire({
    icon: "error",
    title: t("cascade.confirmTitle"),
    html:
      `<p>${t("cascade.confirmText")}</p>` +
      `<p style="margin:.6rem 0 0;font-weight:700;font-size:1.05rem">${nombreSeguro}</p>`,
    input: "text",
    inputPlaceholder: t("cascade.confirmPlaceholder"),
    inputAttributes: { autocapitalize: "off", autocorrect: "off", autocomplete: "off" },
    showCancelButton: true,
    confirmButtonText: t("cascade.confirmDelete"),
    cancelButtonText: t("common.cancel"),
    background: "var(--color-bg-card)",
    color: "var(--color-text-primary)",
    confirmButtonColor: "#ef4444",
    preConfirm: (value: string) => {
      if ((value ?? "").trim() !== nombre.trim()) {
        Swal.showValidationMessage(t("cascade.nameMismatch"));
        return false;
      }
      return true;
    },
  });
  if (!confirm.isConfirmed) return false;

  await cascadeDelete();
  return true;
}
