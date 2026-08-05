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
// Convencion D3 (2026-07-22): manda la de la APP — 1 = Ajustado, 0 = Desajustado.
// (La app calcula: presion minima > thFit o amplitud <= 30 → 0/desajustado.)
export const NIVEL_AJUSTE_MAP = { 1: 'Ajustado', 0: 'Desajustado' } as const;
export type NivelAjusteLabel = typeof NIVEL_AJUSTE_MAP[keyof typeof NIVEL_AJUSTE_MAP];

export function interpretNivelAjuste(value?: number | null): string {
  if (value === undefined || value === null) return '--';
  return value === 0 ? 'Desajustado' : 'Ajustado';
}

// Este texto responde si el respirador está bien puesto — es el dato de
// seguridad de la plataforma — y se pinta en negrita sobre .card. Con los hex
// escritos a mano (los de la paleta OSCURA de globals.css) el tema claro dejaba
// "Ajustado" en 2.28:1, o sea verde limón sobre papel, y "Desajustado" en
// 3.76:1 (auditoría de contraste 2026-08-04). Con los tokens y la paleta VIGENTE
// el tema claro queda en #166534 → 7.13:1 y #b91c1c → 6.47:1 sobre .card blanca.
// (Los valores que citaba este comentario, #1a7f37 5.08:1 y #cf222e 5.36:1, eran
// los del bloque claro ANTES de que la fila de tabla con :hover obligara a bajar
// verde y rojo una parada más.) En tema oscuro --color-green sigue valiendo
// #22c55e (6.89:1), pero --color-red YA NO es #ef4444: se aclaró a red-400
// #f87171 (5.68:1) porque el #ef4444 tampoco llegaba a AA sobre .card oscura.
export function nivelAjusteColor(value?: number | null): string {
  if (value === undefined || value === null) return 'var(--color-text-secondary)';
  return value === 0 ? 'var(--color-red)' : 'var(--color-green)';
}

// --- Nivel de Atollo (saturacion de filtro) ---
// Convencion D4 (2026-07-22): prediccion ML CONTINUA 0–100 (%); −1 o null =
// sin dato (la app emite −1 los primeros ~10 min de jornada). Cortes visuales
// por defecto: ≤60 Baja, ≤80 Media, >80 Alta — los mismos que usa la app.
export const ATOLLO_CORTE_MEDIO = 60;
export const ATOLLO_CORTE_ALTO = 80;

export function interpretNivelAtollo(value?: number | null): string {
  if (value === undefined || value === null || value < 0) return '--';
  if (value <= ATOLLO_CORTE_MEDIO) return 'Baja';
  if (value <= ATOLLO_CORTE_ALTO) return 'Media';
  return 'Alta';
}

// Hermana de nivelAjusteColor y con exactamente el mismo defecto: los tres hexes
// eran los de la paleta OSCURA de globals.css. Las dos funciones se pintan en
// líneas contiguas de la misma tarjeta (CuadrillaClient.tsx:408-409 y :528-529),
// así que dejar una en tokens y la otra en hex partía el par en tema claro.
// Medido sobre .card blanco el 2026-08-04: #22c55e daba 2.28:1, #f59e0b 2.15:1
// y #ef4444 3.76:1 — ninguno llega al 4.5:1 de AA. Con los tokens y la paleta
// VIGENTE el tema claro pasa a 7.13:1 (#166534), 6.47:1 (#b91c1c) y 5.81:1 el
// ámbar (#8a5c00). (Las cifras anteriores de este comentario —5.08:1 con
// #1a7f37, 5.36:1 con #cf222e y 4.87:1 con #9a6700— son las del bloque claro
// antes de la ronda que bajó verde, amarillo, rojo y azul otra parada para
// aprobar también sobre la fila de tabla con :hover.)
// El ámbar se colapsa a --color-yellow aunque #f59e0b NO sea el amarillo de la
// paleta (#eab308): un token propio habría que declararlo en LOS DOS bloques de
// tema de globals.css, y sin él uno de los dos temas se quedaría sin valor, que
// es peor que el corrimiento de tono. Ese es todo el precio: un ámbar→amarillo
// apenas perceptible y SÓLO en tema oscuro (allí --color-yellow vale #eab308,
// que sobre .card sube de 7.31:1 a 8.19:1). En oscuro el verde no cambia ni un
// bit (--color-green = #22c55e, el mismo hex que estaba escrito aquí); el rojo
// sí, porque --color-red se aclaró a #f87171 (3.76:1 → 5.68:1 sobre .card).
export function nivelAtolloColor(value?: number | null): string {
  if (value === undefined || value === null || value < 0) return 'var(--color-text-secondary)';
  if (value <= ATOLLO_CORTE_MEDIO) return 'var(--color-green)';
  if (value <= ATOLLO_CORTE_ALTO) return 'var(--color-yellow)';
  return 'var(--color-red)';
}

// --- Umbrales por defecto de la app movil ---
// D5: alrtFiltrAlto/Bajo se redefinen como % de la prediccion ML (antes Pa).
export const DEFAULT_THRESHOLDS = {
  filtroMedio: ATOLLO_CORTE_MEDIO, // % prediccion — sobre esto = atollo medio (alrtFiltrBajo)
  filtroAlto: ATOLLO_CORTE_ALTO,   // % prediccion — sobre esto = atollo critico (alrtFiltrAlto)
  ajuste: 50,           // % minimo de muestras "ajustado" en la ventana (alrtAjus; la app acepta 0–1 o 0–100)
  respAlto: 25,         // bpm — frecuencia respiratoria alta (alrtRespAlto)
  respBajo: 10,         // bpm — frecuencia respiratoria baja (alrtRespBajo)
  bateAlto: 10,         // % — bateria critica (alrtBateAlto)
  bateMedio: 20,        // % — bateria alerta (alrtBateMedio)
  bateBajo: 30,         // % — bateria baja (alrtBateBajo)
} as const;

// --- Mapeo campos backend ↔ app movil ---
// alrtAjus      ↔ umbral de ajuste (fraccion 0–1 del promedio ajustado)
// alrtFiltrBajo ↔ filtroMedio  — % prediccion para atollo medio (D5)
// alrtFiltrAlto ↔ filtroAlto   — % prediccion para atollo critico (D5)
// alrtRespAlto  ↔ respAlto     — frec. respiratoria alta
// alrtRespBajo  ↔ respBajo     — frec. respiratoria baja
// alrtBateAlto  ↔ bateAlto     — bateria critica
// alrtBateMedio ↔ bateMedio    — bateria alerta
// alrtBateBajo  ↔ bateBajo     — bateria baja

// --- Valor + unidad por tipo de alerta ---
// Solo frecuencia respiratoria (bpm) y bateria (%) tienen un valor medido con unidad.
// Ajuste, filtro y desconexion son estados/eventos sin magnitud → no se muestra valor.
export const VALOR_UNIDAD: Partial<Record<TipoAlerta, string>> = {
  RESPIRATORIA: "bpm",
  BATERIA: "%",
  // El job de vida útil registra el % de uso del filtro como valor medido;
  // sin unidad, la columna VALOR iba vacía mientras la descripción decía "870 %".
  FILTRO_VIDA_UTIL: "%",
};

export function formatValorAlerta(tipo: TipoAlerta, valor?: number | null): string {
  const unidad = VALOR_UNIDAD[tipo];
  if (valor == null || !unidad) return "—";
  return `${fmtNum(valor)} ${unidad}`;
}

// --- Formato de tiempo relativo ---
/** Umbral de frescura de señal: la app sube un lote por segundo (y como mucho
 *  cada 30 s), así que 2 minutos sin mediciones significa sensor callado —
 *  jornada sin señal, no "todo normal". */
export const SIN_SENAL_MS = 2 * 60_000;

/** True si la última medición es lo bastante reciente para considerar que el
 *  sensor sigue emitiendo. Sin timestamp no hay señal. */
export function esMedicionReciente(timestamp?: string | null, ahora: number = Date.now()): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  return Number.isFinite(t) && ahora - t <= SIN_SENAL_MS;
}

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
