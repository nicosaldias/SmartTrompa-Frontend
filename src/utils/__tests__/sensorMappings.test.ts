import { describe, it, expect } from "vitest";
import {
  interpretNivelAjuste,
  nivelAjusteColor,
  interpretNivelAtollo,
  nivelAtolloColor,
  getAlertNivel,
  contarNivelesFiltro,
} from "@/utils/sensorMappings";
import type { AlertaHistorial, JornadaTrabajo, NivelAlerta, TipoAlerta } from "@/types";

function mkAlerta(rut: string, tipo: TipoAlerta, nivel: NivelAlerta, id = 1): AlertaHistorial {
  return { id, tipo, nivel, rutTrabajador: rut, timestamp: "2026-07-20T10:00:00Z", activa: true };
}

function mkJornada(rut: string, id = 1): JornadaTrabajo {
  return { id, rutUsuario: rut, idSupervisor: "sup-1", inicio: "2026-07-20T08:00:00Z", terminada: false };
}

// Convencion D3 (la de la app movil): 1 = Ajustado, 0 = Desajustado.
describe("sensorMappings - interpretNivelAjuste", () => {
  it("retorna '--' cuando el valor es null o undefined", () => {
    expect(interpretNivelAjuste(null)).toBe("--");
    expect(interpretNivelAjuste(undefined)).toBe("--");
  });

  it("retorna 'Desajustado' cuando el valor es 0", () => {
    expect(interpretNivelAjuste(0)).toBe("Desajustado");
  });

  it("retorna 'Ajustado' cuando el valor es 1", () => {
    expect(interpretNivelAjuste(1)).toBe("Ajustado");
  });
});

describe("sensorMappings - nivelAjusteColor", () => {
  it("retorna color secundario cuando falta el valor", () => {
    expect(nivelAjusteColor(null)).toContain("text-secondary");
  });

  it("retorna rojo cuando está desajustado (0) y verde cuando está ajustado (1)", () => {
    expect(nivelAjusteColor(0)).toBe("#ef4444");
    expect(nivelAjusteColor(1)).toBe("#22c55e");
  });
});

// Convencion D4: prediccion ML continua 0-100; -1/null = sin dato; cortes 60/80.
describe("sensorMappings - interpretNivelAtollo", () => {
  it.each([
    [0, "Baja"],
    [45, "Baja"],
    [60, "Baja"],
    [61, "Media"],
    [80, "Media"],
    [81, "Alta"],
    [100, "Alta"],
  ])("interpreta prediccion %s%% como '%s'", (input, expected) => {
    expect(interpretNivelAtollo(input)).toBe(expected);
  });

  it("retorna '--' cuando el valor falta o es -1 (sin dato aun)", () => {
    expect(interpretNivelAtollo(null)).toBe("--");
    expect(interpretNivelAtollo(undefined)).toBe("--");
    expect(interpretNivelAtollo(-1)).toBe("--");
  });
});

describe("sensorMappings - nivelAtolloColor", () => {
  it.each([
    [30, "#22c55e"],
    [70, "#f59e0b"],
    [90, "#ef4444"],
  ])("color para prediccion %s%% es %s", (input, expected) => {
    expect(nivelAtolloColor(input)).toBe(expected);
  });

  it("usa el color secundario para -1/null (sin dato)", () => {
    expect(nivelAtolloColor(-1)).toContain("text-secondary");
    expect(nivelAtolloColor(null)).toContain("text-secondary");
  });
});

describe("sensorMappings - getAlertNivel", () => {
  it("retorna el nivel de la alerta que coincide con rut y tipo", () => {
    const alertas = [
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO"),
      mkAlerta("22.222.222-2", "BATERIA", "ALERTA", 2),
    ];
    expect(getAlertNivel(alertas, "11.111.111-1", "FILTRO")).toBe("CRITICO");
    expect(getAlertNivel(alertas, "22.222.222-2", "BATERIA")).toBe("ALERTA");
  });

  it("retorna OK si el trabajador no tiene alerta de ese tipo", () => {
    const alertas = [mkAlerta("11.111.111-1", "BATERIA", "CRITICO")];
    expect(getAlertNivel(alertas, "11.111.111-1", "FILTRO")).toBe("OK");
    expect(getAlertNivel([], "11.111.111-1", "FILTRO")).toBe("OK");
  });

  it("con varias alertas del mismo rut+tipo gana la MAS SEVERA (una OK vieja no oculta un CRITICO)", () => {
    const escalada = [
      mkAlerta("11.111.111-1", "FILTRO", "ALERTA"),
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO", 2),
    ];
    expect(getAlertNivel(escalada, "11.111.111-1", "FILTRO")).toBe("CRITICO");

    const okViejaPrimero = [
      mkAlerta("11.111.111-1", "FILTRO", "OK"),
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO", 2),
    ];
    expect(getAlertNivel(okViejaPrimero, "11.111.111-1", "FILTRO")).toBe("CRITICO");

    const soloOk = [mkAlerta("11.111.111-1", "FILTRO", "OK")];
    expect(getAlertNivel(soloOk, "11.111.111-1", "FILTRO")).toBe("OK");
  });
});

describe("sensorMappings - contarNivelesFiltro", () => {
  it("cuenta trabajadores activos por severidad de su alerta FILTRO (sin alerta = bajo)", () => {
    const jornadas = [mkJornada("a", 1), mkJornada("b", 2), mkJornada("c", 3), mkJornada("d", 4)];
    const alertas = [
      mkAlerta("a", "FILTRO", "CRITICO"),
      mkAlerta("b", "FILTRO", "ALERTA", 2),
      mkAlerta("c", "FILTRO", "OK", 3),
      // "d" sin alerta FILTRO → bajo
    ];
    expect(contarNivelesFiltro(jornadas, alertas)).toEqual({ bajo: 2, medio: 1, alto: 1 });
  });

  it("escenario del bug: 7 trabajadores con FILTRO CRITICO en tabla → tarjeta 0/0/7", () => {
    const ruts = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"];
    const jornadas = ruts.map((r, i) => mkJornada(r, i + 1));
    const alertas = ruts.map((r, i) => mkAlerta(r, "FILTRO", "CRITICO", i + 1));
    expect(contarNivelesFiltro(jornadas, alertas)).toEqual({ bajo: 0, medio: 0, alto: 7 });
  });

  it("ignora alertas de trabajadores sin jornada activa y otras que no son FILTRO; el total = jornadas", () => {
    const jornadas = [mkJornada("a", 1), mkJornada("b", 2)];
    const alertas = [
      mkAlerta("zz", "FILTRO", "CRITICO"), // sin jornada activa → no cuenta
      mkAlerta("a", "BATERIA", "CRITICO", 2), // otro tipo → no cuenta como filtro
    ];
    const counts = contarNivelesFiltro(jornadas, alertas);
    expect(counts).toEqual({ bajo: 2, medio: 0, alto: 0 });
    expect(counts.bajo + counts.medio + counts.alto).toBe(jornadas.length);
  });
});
