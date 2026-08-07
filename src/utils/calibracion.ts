import type { JornadaTrabajo } from "@/types";
import type { TranslationKey } from "@/i18n/types";

/**
 * Resumen legible de la calibración pre-jornada, derivado de
 * origenCalibracion (V12) + intentosCalibracion (V15).
 *
 * La UI lo renderiza con t(key, params); los flags permiten matizar el tono
 * (omitida = advertencia, sinRegistro = atenuado) y decidir si hay detalle de
 * intentos que consultar en el GET /calibracion-intentos/.
 */
export interface ResumenCalibracion {
  key: TranslationKey;
  params?: Record<string, string | number>;
  /** La jornada abrió con la calibración omitida (desenlace V12). */
  omitida: boolean;
  /** App anterior a V15: no registraba intentos (contador NULL). */
  sinRegistro: boolean;
  /** Hay intentos (N >= 1) que el detalle bajo demanda puede listar. */
  tieneIntentos: boolean;
}

export function resumenCalibracion(
  j: Pick<JornadaTrabajo, "origenCalibracion" | "intentosCalibracion">
): ResumenCalibracion {
  const n = j.intentosCalibracion;

  // NULL/ausente = app vieja: no sabemos qué pasó (≠ 0, que es "omitió sin intentar").
  if (n === null || n === undefined) {
    return { key: "calibracion.sinRegistro", omitida: false, sinRegistro: true, tieneIntentos: false };
  }

  if (j.origenCalibracion === "OMITIDA") {
    if (n === 0) {
      return { key: "calibracion.omitidaSinIntentos", omitida: true, sinRegistro: false, tieneIntentos: false };
    }
    // Intentó (quizá varias veces) y aun así abrió la jornada sin calibrar.
    if (n === 1) {
      return { key: "calibracion.omitidaTrasUnIntento", omitida: true, sinRegistro: false, tieneIntentos: true };
    }
    return {
      key: "calibracion.omitidaTrasIntentos",
      params: { n },
      omitida: true,
      sinRegistro: false,
      tieneIntentos: true,
    };
  }

  // Calibrada (MANUAL/AUTOMATICA). n === 0 solo puede darse con calibración
  // AUTOMATICA sin pulsaciones manuales: cuenta como "a la primera" pero sin
  // detalle consultable.
  if (n > 1) {
    return {
      key: "calibracion.calibroAlIntento",
      params: { n },
      omitida: false,
      sinRegistro: false,
      tieneIntentos: true,
    };
  }
  return { key: "calibracion.calibroPrimera", omitida: false, sinRegistro: false, tieneIntentos: n >= 1 };
}
