import { describe, it, expect } from "vitest";
import { getMockResponse } from "@/api/mock-data";
import type {
  Ajustes,
  AlertaHistorial,
  AuditLogEntry,
  CalibracionIntento,
  JornadaTrabajo,
  PageResponse,
} from "@/types";

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

// Detalle de intentos de calibración pre-jornada (spec 2026-08-07): el mock
// espeja el GET /jornada-trabajo/{id}/calibracion-intentos/ del backend.
describe("mock-data - /jornada-trabajo/{id}/calibracion-intentos", () => {
  it("devuelve los intentos ordenados por numero y coherentes con el contador de la jornada", () => {
    const intentos = getMockResponse(
      "/api/jornada-trabajo/4/calibracion-intentos/",
      "GET"
    ) as CalibracionIntento[];
    expect(intentos.map((i) => i.numero)).toEqual([1, 2, 3]);
    // La jornada 4 declara intentosCalibracion = 3: contador y detalle no divergen.
    const jornada = getMockResponse("/api/jornada-trabajo/4/", "GET") as JornadaTrabajo;
    expect(jornada.intentosCalibracion).toBe(intentos.length);
    // Los fallidos llevan motivo y el exitoso lleva vcal, como redacta la app.
    expect(intentos[0].exitosa).toBe(false);
    expect(intentos[0].motivoDescarte).toBeTruthy();
    expect(intentos[2].exitosa).toBe(true);
    expect(intentos[2].vcalPa).not.toBeNull();
  });

  it("jornada sin detalle registrado responde lista vacía (no 404 en demo)", () => {
    expect(getMockResponse("/api/jornada-trabajo/7/calibracion-intentos/", "GET")).toEqual([]);
  });
});

// Multitenant: la página de auditoría del SuperAdministrador consume un
// PageResponse con empresaId por fila; sin este mock crasheaba en MOCK_MODE.
describe("mock-data - /audit-log paginado", () => {
  it("devuelve PageResponse con entradas de ambas empresas demo (empresaId)", () => {
    const page = getMockResponse(
      "/api/audit-log/?page=0&size=50",
      "GET"
    ) as PageResponse<AuditLogEntry>;
    expect(page.totalElements).toBeGreaterThan(0);
    const empresas = new Set(page.content.map((e) => e.empresaId));
    expect(empresas.has(1)).toBe(true);
    expect(empresas.has(2)).toBe(true);
  });

  it("filtra por acción antes de paginar", () => {
    const page = getMockResponse(
      "/api/audit-log/?page=0&size=50&accion=CREAR_EMPRESA",
      "GET"
    ) as PageResponse<AuditLogEntry>;
    expect(page.totalElements).toBe(1);
    expect(page.content[0].accion).toBe("CREAR_EMPRESA");
  });
});

describe("mock-data - /mediciones-ambientales/jornada/{id}/ajustes", () => {
  it("resume ajustado/desajustado coherente con las mediciones de la jornada", () => {
    // Jornada 2 mock: nivelAjuste=0 en sus 20 mediciones (desajustada).
    const ajustes = getMockResponse(
      "/api/mediciones-ambientales/jornada/2/ajustes/",
      "GET"
    ) as Ajustes;
    expect(ajustes).toEqual({ ajustado: 0, desajustado: 20 });
  });

  it("jornada sin mediciones responde 0/0 (no crash en demo)", () => {
    expect(
      getMockResponse("/api/mediciones-ambientales/jornada/99/ajustes/", "GET")
    ).toEqual({ ajustado: 0, desajustado: 0 });
  });
});
