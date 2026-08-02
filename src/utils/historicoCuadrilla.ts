import type { JornadaTrabajo } from "@/types";

// Helpers puros del Histórico de Cuadrilla: agrupación día→supervisor de la
// lista y geometría de la vista calendario. Sin estado ni fetch — testeables.

export interface GrupoSupervisor {
  supervisorRut: string;
  jornadas: JornadaTrabajo[];
}

export interface GrupoDia {
  /** Clave local yyyy-MM-dd del día (fecha de INICIO de la jornada). */
  diaKey: string;
  fecha: Date;
  supervisores: GrupoSupervisor[];
}

export const SIN_SUPERVISOR = "sin-supervisor";

function diaLocalKey(iso: string): string {
  const d = new Date(iso);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Lista agrupada: días descendentes (lo reciente primero) → dentro de cada día
 * supervisores ordenados por cantidad de jornadas (desc) → jornadas por inicio
 * descendente. El día se define por la fecha LOCAL de inicio de la jornada.
 */
export function agruparPorDiaYSupervisor(jornadas: JornadaTrabajo[]): GrupoDia[] {
  const porDia = new Map<string, Map<string, JornadaTrabajo[]>>();
  for (const j of jornadas) {
    if (!j.inicio) continue;
    const diaKey = diaLocalKey(j.inicio);
    const supKey = j.idSupervisor || SIN_SUPERVISOR;
    if (!porDia.has(diaKey)) porDia.set(diaKey, new Map());
    const supervisores = porDia.get(diaKey)!;
    if (!supervisores.has(supKey)) supervisores.set(supKey, []);
    supervisores.get(supKey)!.push(j);
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([diaKey, supervisores]) => ({
      diaKey,
      fecha: new Date(`${diaKey}T00:00`),
      supervisores: [...supervisores.entries()]
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([supervisorRut, js]) => ({
          supervisorRut,
          jornadas: js.sort(
            (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime()
          ),
        })),
    }));
}

export function duracionMinutos(inicio: string, fin?: string | null): number {
  if (!fin) return 0;
  return Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60_000));
}

export function formatDuracion(minutos: number): string {
  if (minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// ---- Calendario semanal ----

export interface RangoSemana {
  /** Lunes de la semana, 00:00 local. */
  lunes: Date;
  /** Los 7 días (lunes..domingo) a las 00:00 local. */
  dias: Date[];
  /** Límites para el filtro del backend (datetime-local). */
  desde: string;
  hasta: string;
}

/** Semana lunes-domingo que contiene `referencia`, desplazada `offset` semanas. */
export function rangoSemana(referencia: Date, offset: number = 0): RangoSemana {
  const base = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  // getDay(): domingo=0 … sábado=6 → distancia al lunes de SU semana.
  const alLunes = (base.getDay() + 6) % 7;
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - alLunes + offset * 7);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    lunes,
    dias,
    desde: `${fmt(dias[0])}T00:00`,
    hasta: `${fmt(dias[6])}T23:59`,
  };
}

/**
 * Rango horario del eje, derivado de los datos: desde una hora antes del inicio
 * más temprano hasta una después del fin más tardío, acotado a [0,24]. Sin
 * jornadas: 6–20 (horario de operación típico).
 */
export function rangoHorario(jornadas: JornadaTrabajo[]): { hMin: number; hMax: number } {
  if (jornadas.length === 0) return { hMin: 6, hMax: 20 };
  let min = 24;
  let max = 0;
  for (const j of jornadas) {
    const ini = new Date(j.inicio);
    min = Math.min(min, ini.getHours());
    const fin = j.fin ? new Date(j.fin) : ini;
    max = Math.max(max, fin.getHours() + (fin.getMinutes() > 0 ? 1 : 0));
  }
  return { hMin: Math.max(0, min - 1), hMax: Math.min(24, max + 1) };
}

export interface BloqueJornada {
  topPct: number;
  heightPct: number;
}

/**
 * Posición vertical (en % de la columna del día) del bloque inicio→fin dentro
 * del eje [hMin, hMax]. Se recorta al eje; altura mínima 1.5% para que una
 * jornada corta siga siendo clickeable.
 */
export function bloqueDeJornada(
  j: JornadaTrabajo,
  hMin: number,
  hMax: number
): BloqueJornada {
  const span = (hMax - hMin) * 60;
  const ini = new Date(j.inicio);
  const fin = j.fin ? new Date(j.fin) : ini;
  const iniMin = (ini.getHours() - hMin) * 60 + ini.getMinutes();
  const finMin = (fin.getHours() - hMin) * 60 + fin.getMinutes();
  const topPct = Math.max(0, Math.min(100, (iniMin / span) * 100));
  const bottomPct = Math.max(0, Math.min(100, (finMin / span) * 100));
  return { topPct, heightPct: Math.max(1.5, bottomPct - topPct) };
}

// Paleta estable por supervisor: mismo rut → mismo color en toda la vista.
const PALETA_SUPERVISORES = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f97316",
  "#10b981", "#ec4899", "#eab308", "#6366f1",
];

export function colorSupervisor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETA_SUPERVISORES[hash % PALETA_SUPERVISORES.length];
}
