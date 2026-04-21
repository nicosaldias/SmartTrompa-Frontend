// Mapeos y utilidades para datos de sensores — alineados con la app movil (Flutter BLE)

// --- Nivel de Ajuste ---
// La app movil calcula: presion minima > thFit → Desajustado, sino Ajustado
export const NIVEL_AJUSTE_MAP = { 0: 'Ajustado', 1: 'Desajustado' } as const;
export type NivelAjusteLabel = typeof NIVEL_AJUSTE_MAP[keyof typeof NIVEL_AJUSTE_MAP];

export function interpretNivelAjuste(value?: number | null): string {
  if (value === undefined || value === null) return '--';
  return value === 0 ? 'Ajustado' : 'Desajustado';
}

export function nivelAjusteColor(value?: number | null): string {
  if (value === undefined || value === null) return 'var(--color-text-secondary)';
  return value === 0 ? '#22c55e' : '#ef4444';
}

// --- Nivel de Atollo (saturacion de filtro) ---
// La app movil calcula: presion min > thClogLow → Bajo, >= thClogHigh → Medio, < thClogHigh → Alto
export const NIVEL_ATOLLO_MAP = { 0: 'Bajo', 1: 'Medio', 2: 'Alto' } as const;
export type NivelAtolloLabel = typeof NIVEL_ATOLLO_MAP[keyof typeof NIVEL_ATOLLO_MAP];

export function interpretNivelAtollo(value?: number | null): string {
  if (value === undefined || value === null) return '--';
  if (value === 0) return 'Bajo';
  if (value === 1) return 'Medio';
  return 'Alto';
}

export function nivelAtolloColor(value?: number | null): string {
  if (value === undefined || value === null) return 'var(--color-text-secondary)';
  if (value === 0) return '#22c55e';
  if (value === 1) return '#f59e0b';
  return '#ef4444';
}

// --- Umbrales por defecto de la app movil ---
export const DEFAULT_THRESHOLDS = {
  thFit: 101740,        // Pa — presion sobre la cual = desajustado (alrtAjus)
  thClogLow: 101600,    // Pa — presion bajo la cual = atollo medio (alrtFiltrBajo)
  thClogHigh: 101300,   // Pa — presion bajo la cual = atollo critico (alrtFiltrAlto)
  respAlto: 25,         // bpm — frecuencia respiratoria alta (alrtRespAlto)
  respBajo: 10,         // bpm — frecuencia respiratoria baja (alrtRespBajo)
  bateAlto: 10,         // % — bateria critica (alrtBateAlto)
  bateMedio: 20,        // % — bateria alerta (alrtBateMedio)
  bateBajo: 30,         // % — bateria baja (alrtBateBajo)
} as const;

// --- Mapeo campos backend ↔ app movil ---
// alrtAjus      ↔ thFit       — umbral de ajuste del respirador
// alrtFiltrBajo ↔ thClogLow   — umbral de atollo medio
// alrtFiltrAlto ↔ thClogHigh  — umbral de atollo critico
// alrtRespAlto  ↔ respAlto    — frec. respiratoria alta
// alrtRespBajo  ↔ respBajo    — frec. respiratoria baja
// alrtBateAlto  ↔ bateAlto    — bateria critica
// alrtBateMedio ↔ bateMedio   — bateria alerta
// alrtBateBajo  ↔ bateBajo    — bateria baja

// --- Formato de tiempo relativo ---
export function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 0) return 'ahora';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
