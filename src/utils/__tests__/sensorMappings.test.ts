import { describe, it, expect } from "vitest";
import {
  interpretNivelAjuste,
  nivelAjusteColor,
  interpretNivelAtollo,
  nivelAtolloColor,
} from "@/utils/sensorMappings";

describe("sensorMappings - interpretNivelAjuste", () => {
  it("retorna '--' cuando el valor es null o undefined", () => {
    expect(interpretNivelAjuste(null)).toBe("--");
    expect(interpretNivelAjuste(undefined)).toBe("--");
  });

  it("retorna 'Ajustado' cuando el valor es 0", () => {
    expect(interpretNivelAjuste(0)).toBe("Ajustado");
  });

  it("retorna 'Desajustado' para cualquier valor distinto de 0", () => {
    expect(interpretNivelAjuste(1)).toBe("Desajustado");
    expect(interpretNivelAjuste(2)).toBe("Desajustado");
  });
});

describe("sensorMappings - nivelAjusteColor", () => {
  it("retorna color secundario cuando falta el valor", () => {
    expect(nivelAjusteColor(null)).toContain("text-secondary");
  });

  it("retorna verde cuando está ajustado (0) y rojo cuando no", () => {
    expect(nivelAjusteColor(0)).toBe("#22c55e");
    expect(nivelAjusteColor(1)).toBe("#ef4444");
  });
});

describe("sensorMappings - interpretNivelAtollo", () => {
  it.each([
    [0, "Baja"],
    [1, "Media"],
    [2, "Alta"],
    [99, "Alta"],
  ])("interpreta nivel %s como '%s'", (input, expected) => {
    expect(interpretNivelAtollo(input)).toBe(expected);
  });

  it("retorna '--' cuando el valor falta", () => {
    expect(interpretNivelAtollo(null)).toBe("--");
  });
});

describe("sensorMappings - nivelAtolloColor", () => {
  it.each([
    [0, "#22c55e"],
    [1, "#f59e0b"],
    [2, "#ef4444"],
  ])("color para nivel %s es %s", (input, expected) => {
    expect(nivelAtolloColor(input)).toBe(expected);
  });
});
