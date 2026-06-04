import type { MouseEvent } from "react";

/**
 * Abre el calendario nativo al hacer click en cualquier parte del input
 * (no solo sobre el ícono). Sin esto, en Chrome/Edge el datepicker solo se
 * despliega al pinchar el ícono del calendario, lo que es poco intuitivo.
 *
 * showPicker() requiere activación del usuario (el onClick la provee) y puede
 * lanzar en navegadores que no lo soportan o si el input está deshabilitado;
 * por eso va envuelto en try/catch.
 *
 * Uso: <input type="date" onClick={abrirCalendario} style={{ cursor: "pointer" }} />
 */
export function abrirCalendario(e: MouseEvent<HTMLInputElement>): void {
  const input = e.currentTarget;
  if (input.disabled || input.readOnly) return;
  try {
    input.showPicker();
  } catch {
    // Navegador sin soporte para showPicker(): el comportamiento por defecto
    // (click en el ícono) sigue disponible.
  }
}
