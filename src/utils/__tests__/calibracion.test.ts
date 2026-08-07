import { describe, it, expect } from "vitest";
import { resumenCalibracion } from "@/utils/calibracion";
import type { JornadaTrabajo, OrigenCalibracion } from "@/types";

function jornada(
  origenCalibracion?: OrigenCalibracion | null,
  intentosCalibracion?: number | null
): Pick<JornadaTrabajo, "origenCalibracion" | "intentosCalibracion"> {
  return { origenCalibracion, intentosCalibracion };
}

// Los 5 desenlaces del resumen (spec 2026-08-07): NULL = app vieja sin
// registro, 0 = omitió sin intentar, 1 = a la primera, N = varios intentos,
// y omitida tras N intentos fallidos.
describe("resumenCalibracion", () => {
  it("contador NULL o ausente → 'Sin registro' (app vieja), aunque haya origen V12", () => {
    for (const j of [jornada("MANUAL", null), jornada("OMITIDA", null), jornada(undefined, undefined), jornada(null)]) {
      const r = resumenCalibracion(j);
      expect(r.key).toBe("calibracion.sinRegistro");
      expect(r.sinRegistro).toBe(true);
      expect(r.tieneIntentos).toBe(false);
      expect(r.params).toBeUndefined();
    }
  });

  it("OMITIDA + 0 → 'Omitida sin intentos' (hecho conocido, distinto de NULL)", () => {
    const r = resumenCalibracion(jornada("OMITIDA", 0));
    expect(r.key).toBe("calibracion.omitidaSinIntentos");
    expect(r.omitida).toBe(true);
    expect(r.sinRegistro).toBe(false);
    expect(r.tieneIntentos).toBe(false);
  });

  it("OMITIDA + N ≥ 1 → 'Omitida tras N intentos', con detalle consultable y singular para N=1", () => {
    const unIntento = resumenCalibracion(jornada("OMITIDA", 1));
    expect(unIntento.key).toBe("calibracion.omitidaTrasUnIntento");
    expect(unIntento.omitida).toBe(true);
    expect(unIntento.tieneIntentos).toBe(true);

    const varios = resumenCalibracion(jornada("OMITIDA", 3));
    expect(varios.key).toBe("calibracion.omitidaTrasIntentos");
    expect(varios.params).toEqual({ n: 3 });
    expect(varios.omitida).toBe(true);
    expect(varios.tieneIntentos).toBe(true);
  });

  it("calibrada + 1 → 'Calibró a la primera' (MANUAL o AUTOMATICA)", () => {
    for (const origen of ["MANUAL", "AUTOMATICA"] as const) {
      const r = resumenCalibracion(jornada(origen, 1));
      expect(r.key).toBe("calibracion.calibroPrimera");
      expect(r.omitida).toBe(false);
      expect(r.sinRegistro).toBe(false);
      expect(r.tieneIntentos).toBe(true);
    }
  });

  it("calibrada + N > 1 → 'Calibró al intento N'", () => {
    const r = resumenCalibracion(jornada("MANUAL", 4));
    expect(r.key).toBe("calibracion.calibroAlIntento");
    expect(r.params).toEqual({ n: 4 });
    expect(r.omitida).toBe(false);
    expect(r.tieneIntentos).toBe(true);
  });

  it("AUTOMATICA + 0 (sin pulsaciones manuales) → 'a la primera' pero sin detalle consultable", () => {
    const r = resumenCalibracion(jornada("AUTOMATICA", 0));
    expect(r.key).toBe("calibracion.calibroPrimera");
    expect(r.tieneIntentos).toBe(false);
  });
});
