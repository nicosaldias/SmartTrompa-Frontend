import { describe, it, expect } from "vitest";
import { buildAlertasServerParams, type FiltrosHistorialAlertas } from "@/utils/alertasQuery";

const vacios: FiltrosHistorialAlertas = {
  tipo: "",
  nivel: "",
  fechaDesde: "",
  fechaHasta: "",
  trabajadorSearch: "",
};

describe("buildAlertasServerParams", () => {
  it("sin filtros devuelve objeto vacío (el backend trata ausencia como 'todos')", () => {
    expect(buildAlertasServerParams(vacios)).toEqual({});
  });

  it("incluye tipo y nivel juntos: ambos viajan a la misma consulta", () => {
    expect(
      buildAlertasServerParams({ ...vacios, tipo: "BATERIA", nivel: "CRITICO" })
    ).toEqual({ tipo: "BATERIA", nivel: "CRITICO" });
  });

  it("convierte fechas del datetime-local a ISO como inicio/fin", () => {
    const params = buildAlertasServerParams({
      ...vacios,
      fechaDesde: "2026-07-01T08:00",
      fechaHasta: "2026-07-20T18:00",
    });
    expect(params.inicio).toBe(new Date("2026-07-01T08:00").toISOString());
    expect(params.fin).toBe(new Date("2026-07-20T18:00").toISOString());
  });

  it("recorta espacios en la búsqueda de trabajador y la omite si queda vacía", () => {
    expect(buildAlertasServerParams({ ...vacios, trabajadorSearch: "  Juan Pérez  " })).toEqual({
      q: "Juan Pérez",
    });
    expect(buildAlertasServerParams({ ...vacios, trabajadorSearch: "   " })).toEqual({});
  });
});
