import type { NivelAlerta, TipoAlerta } from "@/types";

export interface FiltrosHistorialAlertas {
  tipo: TipoAlerta | "";
  nivel: NivelAlerta | "";
  /** Valor del input datetime-local (ej. "2026-07-01T08:00"), vacío = sin filtro. */
  fechaDesde: string;
  fechaHasta: string;
  /** Búsqueda libre por nombre o rut; se recorta antes de enviar. */
  trabajadorSearch: string;
}

// Traduce los filtros de la UI a los query params del endpoint paginado
// /api/alertas-historial/. Solo incluye los filtros con valor (el backend trata
// la ausencia como "sin filtro"). TODOS los filtros son de servidor: el total y
// totalPages de la respuesta ya vienen calculados sobre el conjunto filtrado
// completo, así que el contador y la paginación nunca pueden contradecir las
// filas visibles.
export function buildAlertasServerParams(f: FiltrosHistorialAlertas): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.tipo) params.tipo = f.tipo;
  if (f.nivel) params.nivel = f.nivel;
  if (f.fechaDesde) params.inicio = new Date(f.fechaDesde).toISOString();
  if (f.fechaHasta) params.fin = new Date(f.fechaHasta).toISOString();
  const q = f.trabajadorSearch.trim();
  if (q) params.q = q;
  return params;
}
