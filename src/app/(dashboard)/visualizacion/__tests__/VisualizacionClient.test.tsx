import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import VisualizacionClient from "../VisualizacionClient";
import type { JornadaTrabajo, Trabajador } from "@/types";

// El cliente API se dobla; el mock de realtime captura los handlers
// por canal para poder disparar eventos STOMP sintéticos desde los tests.
const { historialMock, porJornadasMock, realtimeHandlers } = vi.hoisted(() => ({
  historialMock: vi.fn(),
  porJornadasMock: vi.fn(),
  realtimeHandlers: {} as Record<string, () => void>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/api/client", () => {
  const api = {
    jornadas: { historial: historialMock },
    alertas: { porJornadas: porJornadasMock },
  };
  return { default: api, api };
});
vi.mock("@/realtime/RealtimeProvider", () => ({
  useRealtime: (canal: string, cb: () => void) => {
    realtimeHandlers[canal] = cb;
  },
}));

const AHORA = Date.now();

function mkTerminada(overrides: Partial<JornadaTrabajo> = {}): JornadaTrabajo {
  return {
    id: 1,
    rutUsuario: "16.221.904-4",
    idSupervisor: "15.890.123-K",
    inicio: new Date(AHORA - 8 * 3_600_000).toISOString(),
    fin: new Date(AHORA - 3_600_000).toISOString(),
    dispositivo: "Sensor simulado",
    terminada: true,
    ...overrides,
  };
}

function mkPage(content: JornadaTrabajo[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 200,
    first: true,
    last: true,
  };
}

const TRABAJADORES = [
  { rut: "16.221.904-4", nombre: "Ricardo", apellidoPaterno: "Alarcon" },
  { rut: "15.890.123-K", nombre: "Lucia", apellidoPaterno: "Mendez", cargo: "Supervisor" },
] as Trabajador[];

beforeEach(() => {
  historialMock.mockReset().mockResolvedValue(mkPage([mkTerminada()]));
  porJornadasMock.mockReset().mockResolvedValue([]);
});

describe("VisualizacionClient — histórico de jornadas terminadas en vivo", () => {
  it("carga el historial al montar y muestra la jornada terminada", async () => {
    render(
      <LanguageProvider initialLang="es">
        <VisualizacionClient trabajadores={TRABAJADORES} />
      </LanguageProvider>
    );
    await waitFor(() => expect(historialMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Ricardo Alarcon")).toBeTruthy();
  });

  it("un evento realtime de jornadas refetchea el historial sin recargar", async () => {
    render(
      <LanguageProvider initialLang="es">
        <VisualizacionClient trabajadores={TRABAJADORES} />
      </LanguageProvider>
    );
    await waitFor(() => expect(historialMock).toHaveBeenCalledTimes(1));

    // Llega una jornada recién finalizada: el broker emite en /topic/jornadas.
    historialMock.mockResolvedValue(mkPage([mkTerminada(), mkTerminada({ id: 2, inicio: new Date(AHORA - 2 * 3_600_000).toISOString() })]));
    await act(async () => {
      realtimeHandlers["jornadas"]?.();
    });

    await waitFor(() => expect(historialMock).toHaveBeenCalledTimes(2));
    // La lista agrupa por día: las 2 jornadas pueden caer en días distintos
    // según la hora del reloj, así que se asierta por FILAS del trabajador
    // (una por jornada), no por el conteo del header de día.
    await waitFor(() => expect(screen.getAllByText("Ricardo Alarcon")).toHaveLength(2));
  });

  it("un error de carga muestra error inline con Reintentar (sin modal) y el retry recupera", async () => {
    historialMock.mockRejectedValueOnce(new Error("500"));
    render(
      <LanguageProvider initialLang="es">
        <VisualizacionClient trabajadores={TRABAJADORES} />
      </LanguageProvider>
    );
    const retry = await screen.findByText("Reintentar");

    await act(async () => {
      retry.click();
    });

    expect(await screen.findByText("Ricardo Alarcon")).toBeTruthy();
  });
});
