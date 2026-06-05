/**
 * Formatea un número a un máximo de decimales (sin ceros finales), pensado para
 * valores de sensor/medición que llegan con muchos decimales.
 *
 * Ej (maxDecimals=2): 18.333333 -> "18.33", 18 -> "18", 18.5 -> "18.5".
 * Si el valor es null/undefined/NaN devuelve `fallback` (por defecto "--").
 */
export function fmtNum(
  value: number | null | undefined,
  { maxDecimals = 2, fallback = "--" }: { maxDecimals?: number; fallback?: string } = {}
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}
