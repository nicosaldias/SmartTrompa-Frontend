import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import MiHistorialClient from "../MiHistorialClient";
import type {
  AlertaHistorial,
  AlertasUmbrales,
  FilterStatus,
  JornadaTrabajo,
} from "@/types";

vi.mock("@/api/client", () => ({
  default: {
    jornadas: { byUsuario: vi.fn() },
    alertas: { byTrabajador: vi.fn() },
    filterLifecycle: { estadoByRut: vi.fn() },
    umbrales: { lastByTrabajador: vi.fn() },
  },
}));

const RUT = "11.111.111-1";

function mkJornada(id: number, terminada: boolean): JornadaTrabajo {
  return {
    id,
    rutUsuario: RUT,
    idSupervisor: "22.222.222-2",
    inicio: `2026-07-2${id}T08:00:00Z`,
    fin: terminada ? `2026-07-2${id}T16:00:00Z` : undefined,
    dispositivo: "BreathSensor-036",
    terminada,
  };
}

function mkAlerta(id: number, activa: boolean): AlertaHistorial {
  return {
    id,
    tipo: "AJUSTE",
    nivel: "CRITICO",
    rutTrabajador: RUT,
    timestamp: `2026-07-2${id}T10:00:00Z`,
    activa,
  };
}

const filtro: FilterStatus = {
  trabajadorRut: RUT,
  trabajadorNombre: "Juan",
  tipoFiltro: "P100",
  tipoFiltroId: 1,
  horasUsadas: 120,
  horasMaximas: 200,
  porcentajeUso: 60,
  nivelAlerta: "ADVERTENCIA",
  tieneImagen: false,
};

const umbrales: AlertasUmbrales = {
  id: 1,
  alrtRespAlto: 35,
  alrtRespBajo: 10,
  alrtAjus: 60,
  alrtBateBajo: 20,
  rutTrabajador: RUT,
};

function renderVista(props?: Partial<Parameters<typeof MiHistorialClient>[0]>) {
  return render(
    <LanguageProvider initialLang="es">
      <MiHistorialClient
        rut={RUT}
        initialJornadas={[]}
        initialAlertas={[]}
        initialFiltro={null}
        initialUmbrales={null}
        {...props}
      />
    </LanguageProvider>
  );
}

describe("MiHistorialClient - datos propios del Trabajador", () => {
  it("con datos: filtro con nivel, alertas activas contadas y tablas pobladas", () => {
    renderVista({
      initialJornadas: [mkJornada(1, true), mkJornada(2, false)],
      initialAlertas: [mkAlerta(1, true), mkAlerta(2, false), mkAlerta(3, true)],
      initialFiltro: filtro,
      initialUmbrales: umbrales,
    });

    expect(screen.getByText("ADVERTENCIA")).toBeTruthy();
    expect(screen.getByText("120 h usadas de 200 h")).toBeTruthy();
    // Contador de activas: 2 de las 3 alertas.
    expect(screen.getByText("2")).toBeTruthy();
    // Jornada en curso y terminada conviven (la stat de última jornada
    // repite el badge, por eso getAllBy).
    expect(screen.getAllByText("En curso").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Terminada").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BreathSensor-036").length).toBe(2);
    // Umbrales vigentes con sus valores.
    expect(screen.getByText(/Resp\. Alto/)).toBeTruthy();
  });

  it("sin datos: vacíos honestos en filtro, alertas, jornadas y umbrales", () => {
    renderVista();

    expect(screen.getByText("Sin información de filtro")).toBeTruthy();
    expect(screen.getByText("Sin jornadas aún")).toBeTruthy();
    expect(screen.getByText("Sin alertas registradas")).toBeTruthy();
    expect(screen.getByText("Sin jornadas registradas")).toBeTruthy();
    expect(
      screen.getByText("Sin umbrales asignados: aplican los valores por defecto del sistema")
    ).toBeTruthy();
  });
});
