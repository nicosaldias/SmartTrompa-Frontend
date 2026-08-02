// Tokens de color semántico de alertas — fuente única para TODAS las vistas.
// Antes cada vista declaraba su propio TIPO_COLORS/NIVEL_COLORS (o un switch
// con hexes sueltos) y el mismo tipo cambiaba de color entre pantallas.

import type { TipoAlerta, NivelAlerta } from "@/types";

export const TIPO_COLORS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "#ef4444",     // rojo — riesgo fisiológico directo
  AJUSTE: "#f97316",           // naranja
  FILTRO: "#eab308",           // amarillo — saturación instantánea
  FILTRO_VIDA_UTIL: "#8b5cf6", // violeta — desgaste acumulado (job)
  BATERIA: "#3b82f6",          // azul
  DESCONEXION: "#6b7280",      // gris — pérdida de señal, no medición
};

export const NIVEL_COLORS: Record<NivelAlerta, string> = {
  OK: "#22c55e",
  ALERTA: "#f59e0b",
  CRITICO: "#ef4444",
};

export function nivelColor(nivel: NivelAlerta): string {
  return NIVEL_COLORS[nivel] ?? "#6b7280";
}

export function tipoColor(tipo: TipoAlerta): string {
  return TIPO_COLORS[tipo] ?? "#6b7280";
}
