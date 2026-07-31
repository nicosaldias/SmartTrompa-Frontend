import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CuadrillaClient from "../CuadrillaClient";
import type { JornadaTrabajo, Trabajador } from "@/types";

// Swal y el cliente API se doblan; el hook de realtime no abre sockets en tests.
const { fireMock, finalizarMock } = vi.hoisted(() => ({
  fireMock: vi.fn(),
  finalizarMock: vi.fn(),
}));
vi.mock("sweetalert2", () => ({ default: { fire: fireMock } }));
vi.mock("@/api/client", () => {
  const api = {
    jornadas: { activas: vi.fn().mockResolvedValue([]), finalizar: finalizarMock },
    alertas: { activas: vi.fn().mockResolvedValue([]) },
    mediciones: {
      latestByJornada: vi.fn().mockResolvedValue(null),
      ajustesByJornada: vi.fn().mockResolvedValue(null),
    },
  };
  return { default: api, api };
});
vi.mock("@/realtime/RealtimeProvider", () => ({ useRealtime: () => undefined }));

const AHORA = Date.now();

function mkJornada(overrides: Partial<JornadaTrabajo> = {}): JornadaTrabajo {
  return {
    id: 9,
    rutUsuario: "16.221.904-4",
    idSupervisor: "15.890.123-K",
    inicio: new Date(AHORA - 3_600_000).toISOString(),
    dispositivo: "Sensor simulado",
    terminada: false,
    ...overrides,
  };
}

const TRABAJADORES = [
  { rut: "16.221.904-4", nombre: "Ricardo", apellidoPaterno: "Alarcon" },
  { rut: "15.890.123-K", nombre: "Lucia", apellidoPaterno: "Mendez" },
] as Trabajador[];

function renderCuadrilla(medTimestamp: string | null) {
  return render(
    <LanguageProvider initialLang="es">
      <CuadrillaClient
        initialJornadas={[mkJornada()]}
        initialAlertas={[]}
        trabajadores={TRABAJADORES}
        initialMediciones={{
          "9": medTimestamp ? ({ id: 1, jornadaId: 9, timestamp: medTimestamp } as never) : null,
        }}
      />
    </LanguageProvider>
  );
}

beforeEach(() => {
  fireMock.mockReset().mockResolvedValue({ isConfirmed: true });
  finalizarMock.mockReset().mockResolvedValue(undefined);
});

describe("CuadrillaClient — frescura de señal y finalizar jornada", () => {
  it("con la última medición vieja la tarjeta dice SIN SEÑAL en vez de NORMAL", () => {
    renderCuadrilla(new Date(AHORA - 10 * 60_000).toISOString());
    expect(screen.getAllByText("SIN SEÑAL").length).toBeGreaterThan(0);
    expect(screen.queryByText("NORMAL")).toBeNull();
  });

  it("con señal fresca no hay SIN SEÑAL y el diálogo advierte que sigue midiendo", async () => {
    renderCuadrilla(new Date(AHORA - 5_000).toISOString());
    expect(screen.queryByText("SIN SEÑAL")).toBeNull();
    fireEvent.click(screen.getAllByText("Finalizar")[0]);
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    expect(fireMock.mock.calls[0][0].icon).toBe("warning");
  });

  it("confirmar el diálogo llama al endpoint con el id de la jornada", async () => {
    renderCuadrilla(new Date(AHORA - 10 * 60_000).toISOString());
    fireEvent.click(screen.getAllByText("Finalizar")[0]);
    await waitFor(() => expect(finalizarMock).toHaveBeenCalledWith(9));
    // Sin señal reciente el diálogo es pregunta normal, no advertencia.
    expect(fireMock.mock.calls[0][0].icon).toBe("question");
  });

  it("si el usuario cancela no se toca el endpoint", async () => {
    fireMock.mockResolvedValue({ isConfirmed: false });
    renderCuadrilla(null);
    fireEvent.click(screen.getAllByText("Finalizar")[0]);
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    expect(finalizarMock).not.toHaveBeenCalled();
  });
});
