import { describe, it, expect } from "vitest";
import { validarOrdenUmbrales, type ValoresUmbral } from "../validacionUmbrales";
import { DEFAULT_THRESHOLDS } from "@/utils/sensorMappings";

function valores(parcial: Partial<ValoresUmbral> = {}): ValoresUmbral {
  return {
    alrtRespAlto: "",
    alrtRespBajo: "",
    alrtFiltrAlto: "",
    alrtFiltrBajo: "",
    alrtBateAlto: "",
    alrtBateMedio: "",
    alrtBateBajo: "",
    ...parcial,
  };
}

const bateriaPorDefecto = {
  alrtBateAlto: String(DEFAULT_THRESHOLDS.bateAlto),
  alrtBateMedio: String(DEFAULT_THRESHOLDS.bateMedio),
  alrtBateBajo: String(DEFAULT_THRESHOLDS.bateBajo),
};

describe("validarOrdenUmbrales", () => {
  it("acepta los valores por defecto de batería (alto < medio < bajo)", () => {
    expect(validarOrdenUmbrales(valores(bateriaPorDefecto))).toEqual([]);
  });

  it("no valida campos vacíos", () => {
    expect(validarOrdenUmbrales(valores())).toEqual([]);
    expect(
      validarOrdenUmbrales(valores({ alrtBateMedio: "20" }))
    ).toEqual([]);
  });

  it("rechaza Bat. Medio mayor o igual que Bat. Bajo", () => {
    expect(
      validarOrdenUmbrales(valores({ alrtBateMedio: "35", alrtBateBajo: "30" }))
    ).toEqual(["umbrales.validation.bateMedioOrder"]);
    expect(
      validarOrdenUmbrales(valores({ alrtBateMedio: "30", alrtBateBajo: "30" }))
    ).toEqual(["umbrales.validation.bateMedioOrder"]);
  });

  it("detecta ambos errores de batería cuando el orden viene invertido", () => {
    const errores = validarOrdenUmbrales(
      valores({ alrtBateAlto: "30", alrtBateMedio: "20", alrtBateBajo: "10" })
    );
    expect(errores).toEqual([
      "umbrales.validation.bateAltoOrder",
      "umbrales.validation.bateMedioOrder",
    ]);
  });

  it("mantiene las validaciones de filtro y respiración", () => {
    const errores = validarOrdenUmbrales(
      valores({
        ...bateriaPorDefecto,
        alrtFiltrAlto: "40",
        alrtFiltrBajo: "60",
        alrtRespAlto: "10",
        alrtRespBajo: "25",
      })
    );
    expect(errores).toEqual([
      "umbrales.validation.filtroOrder",
      "umbrales.validation.respOrder",
    ]);
  });
});
