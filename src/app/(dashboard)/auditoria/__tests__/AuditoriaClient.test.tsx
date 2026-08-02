import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import AuditoriaClient from "../AuditoriaClient";
import type { AuditLogEntry, PageResponse } from "@/types";

const { listPagedMock } = vi.hoisted(() => ({ listPagedMock: vi.fn() }));

vi.mock("@/api/client", () => ({
  default: { auditLog: { listPaged: listPagedMock } },
}));

// Passthrough del debounce: los cambios de filtro disparan el fetch de inmediato.
vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: unknown) => v,
}));

function mkEntry(id: number, extra: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id,
    actorRut: "11.111.111-1",
    actorCargo: "Administrador",
    accion: "ELIMINAR_TRABAJADOR",
    entidad: "trabajador",
    entidadId: String(id),
    detalle: null,
    resultado: "OK",
    origen: "10.0.0.1",
    timestamp: "2026-08-02T10:00:00Z",
    ...extra,
  };
}

function mkPage(
  content: AuditLogEntry[],
  totalElements: number,
  totalPages: number
): PageResponse<AuditLogEntry> {
  return {
    content,
    totalElements,
    totalPages,
    number: 0,
    size: 50,
    first: true,
    last: totalPages <= 1,
    empty: content.length === 0,
  };
}

function renderConPagina(initialPage: PageResponse<AuditLogEntry>) {
  return render(
    <LanguageProvider initialLang="es">
      <AuditoriaClient initialPage={initialPage} />
    </LanguageProvider>
  );
}

beforeEach(() => {
  listPagedMock.mockReset();
});

describe("AuditoriaClient - filtros al servidor y detalle expandible", () => {
  it("el filtro por actor viaja al servidor y el total refleja su respuesta", async () => {
    renderConPagina(mkPage([mkEntry(1)], 1, 1));
    expect(screen.getByText("1 registros")).toBeTruthy();

    listPagedMock.mockResolvedValue(
      mkPage([mkEntry(2, { accion: "LOGIN_OK" })], 12, 1)
    );
    fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), {
      target: { value: "22.222.222-2" },
    });

    await waitFor(() => expect(screen.getByText("12 registros")).toBeTruthy());
    expect(listPagedMock).toHaveBeenCalledWith(0, 50, { actor: "22.222.222-2" });
    expect(screen.getByText("LOGIN_OK")).toBeTruthy();
  });

  it("sin resultados muestra el vacío honesto y sin paginación", async () => {
    renderConPagina(mkPage(Array.from({ length: 50 }, (_, i) => mkEntry(i + 1)), 120, 3));

    listPagedMock.mockResolvedValue(mkPage([], 0, 0));
    fireEvent.change(screen.getByPlaceholderText("LOGIN, ELIMINAR…"), {
      target: { value: "NO_EXISTE" },
    });

    await waitFor(() =>
      expect(screen.getByText("Sin registros para los filtros seleccionados")).toBeTruthy()
    );
    expect(screen.queryByText("«")).toBeNull();
    expect(listPagedMock).toHaveBeenCalledWith(0, 50, { accion: "NO_EXISTE" });
  });

  it("una fila con detalle se expande al clickearla y muestra el JSON", () => {
    const detalle = '{"ruta":"/api/trabajador/","query":"page=0"}';
    renderConPagina(mkPage([mkEntry(1, { detalle })], 1, 1));

    expect(screen.queryByText(detalle)).toBeNull();
    fireEvent.click(screen.getByText("ELIMINAR_TRABAJADOR"));
    expect(screen.getByText(detalle)).toBeTruthy();
  });
});
