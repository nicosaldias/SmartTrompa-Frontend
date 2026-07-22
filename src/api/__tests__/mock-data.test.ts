import { describe, it, expect } from "vitest";
import { getMockResponse } from "@/api/mock-data";
import type { AlertaHistorial, PageResponse } from "@/types";

function pagedAlertas(qs: string): PageResponse<AlertaHistorial> {
  return getMockResponse(
    `/api/alertas-historial/?page=0&size=20&${qs}`,
    "GET"
  ) as PageResponse<AlertaHistorial>;
}

// El mock debe comportarse como el backend real: filtrar ANTES de paginar, de
// modo que totalElements/totalPages siempre correspondan a las filas visibles.
describe("mock-data - /alertas-historial paginado con filtros combinados", () => {
  it("tipo + nivel sin coincidencias: total 0, sin páginas y sin filas", () => {
    // En el fixture hay BATERIA CRITICO y BATERIA ALERTA, pero ninguna BATERIA OK.
    const page = pagedAlertas("tipo=BATERIA&nivel=OK");
    expect(page.totalElements).toBe(0);
    expect(page.totalPages).toBe(0);
    expect(page.content).toEqual([]);
  });

  it("tipo + nivel con coincidencias cuenta solo las filas que cumplen ambos", () => {
    const page = pagedAlertas("tipo=BATERIA&nivel=CRITICO");
    expect(page.totalElements).toBe(1);
    expect(page.content.every((a) => a.tipo === "BATERIA" && a.nivel === "CRITICO")).toBe(true);
  });

  it("q filtra por fragmento de rut antes de paginar", () => {
    const page = pagedAlertas("q=15.678");
    expect(page.totalElements).toBe(3);
    expect(page.content.every((a) => a.rutTrabajador.includes("15.678"))).toBe(true);
  });
});
