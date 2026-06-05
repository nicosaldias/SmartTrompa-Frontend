/**
 * Formatea un número para mostrarlo al usuario con un máximo de 2 decimales.
 * Redondea (no trunca) y elimina ceros finales: 18.4732 -> "18.47", 87.5 -> "87.5", 20 -> "20".
 * Devuelve "--" si el valor es nulo o no finito.
 */
export function fmtNum(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return String(Math.round(value * 100) / 100);
}
