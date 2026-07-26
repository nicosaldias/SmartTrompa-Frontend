import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import HistorialAlertasClient from "../HistorialAlertasClient";
import type { AlertaHistorial, PageResponse } from "@/types";

const { listPagedMock } = vi.hoisted(() => ({ listPagedMock: vi.fn() }));

vi.mock("@/api/client", () => ({
  default: { alertas: { listPaged: listPagedMock } },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Passthrough del debounce: los cambios de filtro disparan el fetch de inmediato.
vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: unknown) => v,
}));

function mkAlerta(id: number): AlertaHistorial {
  return {
    id,
    tipo: "BATERIA",
    nivel: "CRITICO",
    rutTrabajador: `1${id}.111.111-1`,
    timestamp: "2026-07-20T10:00:00Z",
    activa: true,
  };
}

function mkPage(
  content: AlertaHistorial[],
  totalElements: number,
  totalPages: number
): PageResponse<AlertaHistorial> {
  return {
    content,
    totalElements,
    totalPages,
    number: 0,
    size: 20,
    first: true,
    last: totalPages <= 1,
    empty: content.length === 0,
  };
}

function renderConPagina(initialPage: PageResponse<AlertaHistorial>) {
  return render(
    <LanguageProvider initialLang="es">
      <HistorialAlertasClient initialPage={initialPage} />
    </LanguageProvider>
  );
}

// El select de nivel es el segundo combobox del panel de filtros (tipo es el primero).
function selectNivel(): HTMLElement {
  return screen.getAllByRole("combobox")[1];
}

beforeEach(() => {
  listPagedMock.mockReset();
});

describe("HistorialAlertasClient - filtros combinados y paginación coherente", () => {
  it("escenario del bug: combinación sin resultados oculta el total y la paginación", async () => {
    // Estado inicial: 800 alertas en 40 páginas → paginación visible.
    const inicial = mkPage(Array.from({ length: 20 }, (_, i) => mkAlerta(i + 1)), 800, 40);
    renderConPagina(inicial);
    expect(screen.getByText(/Mostrando 1-20 de 800/)).toBeTruthy();

    // Al combinar nivel=OK el servidor responde 0 filas y total 0.
    listPagedMock.mockResolvedValue(mkPage([], 0, 0));
    fireEvent.change(selectNivel(), { target: { value: "OK" } });

    await waitFor(() =>
      expect(screen.getByText("Sin alertas que coincidan con los filtros")).toBeTruthy()
    );
    // Sin filas no puede haber contador ni botones de página.
    expect(screen.queryByText(/Mostrando/)).toBeNull();
    expect(screen.queryByText("Anterior")).toBeNull();
    expect(screen.queryByText("Siguiente")).toBeNull();
    // El filtro viajó al servidor (única fuente del total).
    expect(listPagedMock).toHaveBeenCalledWith(0, 20, { nivel: "OK" });
  });

  it("con resultados, el contador refleja el total filtrado por el servidor", async () => {
    renderConPagina(mkPage([mkAlerta(1)], 1, 1));

    listPagedMock.mockResolvedValue(
      mkPage(Array.from({ length: 20 }, (_, i) => mkAlerta(i + 1)), 45, 3)
    );
    fireEvent.change(selectNivel(), { target: { value: "CRITICO" } });

    await waitFor(() => expect(screen.getByText(/Mostrando 1-20 de 45/)).toBeTruthy());
    expect(listPagedMock).toHaveBeenCalledWith(0, 20, { nivel: "CRITICO" });
  });
});
