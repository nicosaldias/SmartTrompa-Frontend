// Formato único de fecha/hora de la plataforma: es-CL, 24 h, zona de Chile.
// Antes convivían 7 variantes (12 h con coma, hora sin fecha, "8 jun 2026",
// toLocaleDateString sin locale — que en un navegador en-US cambiaba el orden
// de día y mes—, dd-MM-yy custom). Toda vista de datos debe formatear con
// estas funciones, no con toLocale* directo.

const LOCALE = "es-CL";
const TZ = "America/Santiago";

type FechaISO = string | number | Date;

/** dd-mm-aaaa hh:mm (24 h) — para celdas de tablas y detalles. */
export function formatFechaHora(valor: FechaISO): string {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleString(LOCALE, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: TZ,
    })
    .replace(",", "");
}

/** dd-mm hh:mm (24 h) — para feeds y espacios angostos; el día evita que una
 * alerta con días abiertos parezca de hoy. */
export function formatFechaCorta(valor: FechaISO): string {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleString(LOCALE, {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: TZ,
    })
    .replace(",", "");
}

/** dd-mm-aaaa — fecha sola. */
export function formatFecha(valor: FechaISO): string {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ,
  });
}

/** hh:mm (24 h) — hora sola, para rangos dentro de un mismo día ya rotulado. */
export function formatHora(valor: FechaISO): string {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(LOCALE, {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
  });
}
