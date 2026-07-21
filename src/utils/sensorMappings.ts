// Mapeos y utilidades para datos de sensores — alineados con la app movil (Flutter BLE)
import type { AlertaHistorial, JornadaTrabajo, NivelAlerta, TipoAlerta } from "@/types";
import { fmtNum } from "@/utils/format";

// --- Nivel de alerta activa por trabajador y tipo ---
// Regla unica compartida por la tabla de Estado de Cuadrilla y el bloque
// Resumen Jornada Actual: entre todas las alertas que coinciden con rut+tipo
// gana la MAS SEVERA (el backend puede acumular varias activas del mismo tipo
// sin resolver las viejas — una OK antigua no debe ocultar un CRITICO vigente);
// sin alerta = OK.
const SEVERIDAD_NIVEL: Record<NivelAlerta, number> = { OK: 0, ALERTA: 1, CRITICO: 2 };

export function getAlertNivel(alertas: AlertaHistorial[], rut: string, tipo: TipoAlerta): NivelAlerta {
  let peor: NivelAlerta | null = null;
  for (const a of alertas) {
    if (a.rutTrabajador !== rut || a.tipo !== tipo) continue;
    if (peor === null || SEVERIDAD_NIVEL[a.nivel] > SEVERIDAD_NIVEL[peor]) peor = a.nivel;
  }
  return peor ?? "OK";
}

// Conteo de trabajadores activos por severidad de su alerta FILTRO, para la
// tarjeta "Saturacion filtro". Debe coincidir 1:1 con la columna Filtro de la
// tabla de Estado de Cuadrilla (misma fuente: alertas activas, via getAlertNivel);
// el nivelAtollo del sensor NO participa aqui.
export function contarNivelesFiltro(
  jornadas: JornadaTrabajo[],
  alertas: AlertaHistorial[]
): { bajo: number; medio: number; alto: number } {
  const counts = { bajo: 0, medio: 0, alto: 0 };
  for (const j of jornadas) {
    const nivel = getAlertNivel(alertas, j.rutUsuario, "FILTRO");
    if (nivel === "CRITICO") counts.alto++;
    else if (nivel === "ALERTA") counts.medio++;
    else counts.bajo++;
  }
  return counts;
}

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
export const NIVEL_ATOLLO_MAP = { 0: 'Baja', 1: 'Media', 2: 'Alta' } as const;
export type NivelAtolloLabel = typeof NIVEL_ATOLLO_MAP[keyof typeof NIVEL_ATOLLO_MAP];

export function interpretNivelAtollo(value?: number | null): string {
  if (value === undefined || value === null) return '--';
  if (value === 0) return 'Baja';
  if (value === 1) return 'Media';
  return 'Alta';
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

// --- Valor + unidad por tipo de alerta ---
// Solo frecuencia respiratoria (bpm) y bateria (%) tienen un valor medido con unidad.
// Ajuste, filtro y desconexion son estados/eventos sin magnitud → no se muestra valor.
export const VALOR_UNIDAD: Partial<Record<TipoAlerta, string>> = {
  RESPIRATORIA: "bpm",
  BATERIA: "%",
};

export function formatValorAlerta(tipo: TipoAlerta, valor?: number | null): string {
  const unidad = VALOR_UNIDAD[tipo];
  if (valor == null || !unidad) return "—";
  return `${fmtNum(valor)} ${unidad}`;
}

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
