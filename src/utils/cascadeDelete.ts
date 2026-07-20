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
  /** Nota adicional (ya traducida) sobre el alcance del borrado, ej. jornadas supervisadas. */
  notaAlcance?: string;
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

export type DeleteImpactDecision = "cancel" | "simple" | "cascade";

/**
 * Vista previa de impacto SIEMPRE antes de borrar: consulta las relaciones y
 * pide la confirmación acorde a lo que se afectará.
 *  - Sin registros asociados (total 0, conteo disponible): confirmación simple → "simple".
 *  - Con registros asociados (o conteo no disponible): advertencia con el detalle
 *    de lo que se borrará + confirmación escribiendo el nombre → "cascade".
 *
 * NO ejecuta el borrado: devuelve la decisión para que el llamador elija el
 * endpoint (plano vs cascada) y maneje sus propios errores (ej. anti-lockout de
 * trabajadores, TOCTOU). Devuelve "cancel" si el usuario desiste.
 */
export async function confirmDeleteWithImpact({
  nombre,
  fetchRelaciones,
  notaAlcance,
  t,
}: Pick<CascadeDeleteArgs, "nombre" | "fetchRelaciones" | "notaAlcance" | "t">): Promise<DeleteImpactDecision> {
  let rel: RelacionesResumen | null = null;
  let conteoDisponible = true;
  try {
    rel = await fetchRelaciones();
  } catch {
    // Si el conteo falla, no asumimos que es seguro: se trata como con impacto.
    conteoDisponible = false;
  }

  const nombreSeguro = escapeHtml(nombre);
  const total = rel?.total ?? 0;

  // Caso seguro: el conteo se obtuvo y no hay nada relacionado.
  if (conteoDisponible && total === 0) {
    const res = await Swal.fire({
      icon: "question",
      title: t("cascade.simpleTitle"),
      html:
        `<p>${t("cascade.simpleText", { name: nombreSeguro })}</p>` +
        `<p style="margin-top:.75rem;font-size:.85rem;text-align:left;opacity:.85">${t("cascade.simpleNoImpact")}</p>`,
      showCancelButton: true,
      confirmButtonText: t("cascade.simpleConfirm"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#ef4444",
    });
    return res.isConfirmed ? "simple" : "cancel";
  }

  // Caso con impacto (o conteo no disponible): advertencia + confirmación por nombre.
  const notas =
    (notaAlcance
      ? `<p style="margin-top:.5rem;font-size:.8rem;text-align:left">${escapeHtml(notaAlcance)}</p>`
      : "") +
    `<p style="margin-top:.5rem;font-size:.75rem;text-align:left;opacity:.75">${
      conteoDisponible ? t("cascade.countsMayVary") : t("cascade.countUnavailable")
    }</p>`;

  const warn = await Swal.fire({
    icon: "warning",
    title: t("cascade.warnTitle"),
    html:
      `<p>${t("cascade.warnText", { name: nombreSeguro })}</p>` +
      listaRelaciones(rel, t) +
      notas +
      `<p style="margin-top:.75rem">${t("cascade.warnQuestion")}</p>`,
    showCancelButton: true,
    confirmButtonText: t("cascade.warnConfirm"),
    cancelButtonText: t("common.cancel"),
    background: "var(--color-bg-card)",
    color: "var(--color-text-primary)",
    confirmButtonColor: "#ef4444",
  });
  if (!warn.isConfirmed) return "cancel";

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
  if (!confirm.isConfirmed) return "cancel";
  return "cascade";
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
  notaAlcance,
  t,
}: CascadeDeleteArgs): Promise<boolean> {
  let rel: RelacionesResumen | null = null;
  try {
    rel = await fetchRelaciones();
  } catch {
    // Si el conteo falla, seguimos con una advertencia genérica.
  }

  const nombreSeguro = escapeHtml(nombre);

  // Entre la advertencia y la confirmación puede entrar actividad nueva (TOCTOU):
  // se avisa que los conteos son referenciales.
  const notas =
    (notaAlcance
      ? `<p style="margin-top:.5rem;font-size:.8rem;text-align:left">${escapeHtml(notaAlcance)}</p>`
      : "") +
    `<p style="margin-top:.5rem;font-size:.75rem;text-align:left;opacity:.75">${t("cascade.countsMayVary")}</p>`;

  const warn = await Swal.fire({
    icon: "warning",
    title: t("cascade.warnTitle"),
    html:
      `<p>${t("cascade.warnText", { name: nombreSeguro })}</p>` +
      listaRelaciones(rel, t) +
      notas +
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
