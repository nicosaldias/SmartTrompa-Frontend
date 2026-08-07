import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import EmpresasClient from "../EmpresasClient";
import type { Empresa } from "@/types";

const { fireMock, apiEmpresas, getEmpresaActivaMock, setEmpresaActivaMock } = vi.hoisted(() => ({
  fireMock: vi.fn(),
  apiEmpresas: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleHabilitada: vi.fn(),
    relaciones: vi.fn(),
    delete: vi.fn(),
  },
  getEmpresaActivaMock: vi.fn(),
  setEmpresaActivaMock: vi.fn(),
}));
vi.mock("sweetalert2", () => ({ default: { fire: fireMock } }));
vi.mock("@/api/client", () => ({ api: { empresas: apiEmpresas } }));
vi.mock("@/utils/cookies", () => ({
  getEmpresaActivaFromCookie: getEmpresaActivaMock,
  getUserFromCookie: vi.fn(() => null),
}));
vi.mock("@/actions/auth", () => ({ setEmpresaActivaAction: setEmpresaActivaMock }));

function mkEmpresa(id: number, extra: Partial<Empresa> = {}): Empresa {
  return {
    id,
    nombre: `Empresa ${id}`,
    rutEmpresa: `76.000.00${id}-${id}`,
    habilitada: true,
    ...extra,
  };
}

function renderCliente(empresas: Empresa[]) {
  return render(
    <LanguageProvider initialLang="es">
      <EmpresasClient initialEmpresas={empresas} />
    </LanguageProvider>
  );
}

describe("EmpresasClient (CRUD solo SuperAdministrador)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fireMock.mockResolvedValue({ isConfirmed: true });
    apiEmpresas.list.mockResolvedValue([]);
    getEmpresaActivaMock.mockReturnValue(null);
    setEmpresaActivaMock.mockResolvedValue({ success: true });
  });

  it("lista las empresas con su estado", () => {
    renderCliente([mkEmpresa(1), mkEmpresa(2, { habilitada: false })]);
    expect(screen.getByText("Empresa 1")).toBeTruthy();
    expect(screen.getByText("Empresa 2")).toBeTruthy();
    expect(screen.getByText("Habilitada")).toBeTruthy();
    expect(screen.getByText("Deshabilitada")).toBeTruthy();
  });

  it("la búsqueda filtra por nombre y RUT", () => {
    renderCliente([
      mkEmpresa(1, { nombre: "Minera Andina" }),
      mkEmpresa(2, { nombre: "Constructora Sur" }),
    ]);
    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o RUT..."), {
      target: { value: "minera" },
    });
    expect(screen.getByText("Minera Andina")).toBeTruthy();
    expect(screen.queryByText("Constructora Sur")).toBeNull();
  });

  it("crear empresa: confirma y llama al API con los campos trimmeados", async () => {
    apiEmpresas.create.mockResolvedValue(mkEmpresa(9));
    renderCliente([]);
    fireEvent.click(screen.getByText("Nueva empresa"));
    fireEvent.change(screen.getByPlaceholderText("Ej: Minera Andina SpA"), {
      target: { value: "  Nueva SpA  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Ej: 76.123.456-7"), {
      target: { value: "76.555.555-5" },
    });
    fireEvent.submit(screen.getByText("Guardar").closest("form")!);
    await waitFor(() =>
      expect(apiEmpresas.create).toHaveBeenCalledWith({
        nombre: "Nueva SpA",
        rutEmpresa: "76.555.555-5",
      })
    );
  });

  it("crear con solo espacios avisa y NO llama al API", async () => {
    renderCliente([]);
    fireEvent.click(screen.getByText("Nueva empresa"));
    fireEvent.change(screen.getByPlaceholderText("Ej: Minera Andina SpA"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByPlaceholderText("Ej: 76.123.456-7"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByText("Guardar").closest("form")!);
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    expect(fireMock.mock.calls[0][0]).toMatchObject({
      text: "El nombre y el RUT son obligatorios",
    });
    expect(apiEmpresas.create).not.toHaveBeenCalled();
  });

  it("eliminar con registros asociados se bloquea sin llamar a delete", async () => {
    apiEmpresas.relaciones.mockResolvedValue({ trabajadores: 3, roles: 0 });
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Eliminar"));
    await waitFor(() => expect(apiEmpresas.relaciones).toHaveBeenCalledWith(1));
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    // La advertencia de relaciones no debe desembocar en el DELETE.
    expect(apiEmpresas.delete).not.toHaveBeenCalled();
  });

  it("toggle deshabilitar advierte que corta el acceso de los usuarios", async () => {
    apiEmpresas.toggleHabilitada.mockResolvedValue(mkEmpresa(1, { habilitada: false }));
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Deshabilitar"));
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    expect(JSON.stringify(fireMock.mock.calls[0][0])).toContain(
      "no podrán iniciar sesión"
    );
    await waitFor(() => expect(apiEmpresas.toggleHabilitada).toHaveBeenCalledWith(1));
  });

  it("el aviso de relaciones traduce las claves del backend y deja crudas las desconocidas", async () => {
    // Claves conocidas → etiqueta i18n; clave nueva del backend → cruda; n=0 no aparece.
    apiEmpresas.relaciones.mockResolvedValue({
      trabajadores: 3,
      tiposFiltro: 2,
      claveRara: 1,
      roles: 0,
    });
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Eliminar"));
    await waitFor(() => expect(fireMock).toHaveBeenCalled());
    const texto = String(fireMock.mock.calls[0][0].text);
    expect(texto).toContain("Trabajadores: 3");
    expect(texto).toContain("Tipos de filtro: 2");
    expect(texto).toContain("claveRara: 1");
    // La clave interna del backend no debe quedar visible cuando hay traducción.
    expect(texto).not.toContain("tiposFiltro");
    expect(texto).not.toContain("Roles");
  });

  it("eliminar la empresa ACTIVA en st_empresa limpia la empresa activa (y recarga en vez de repoblar)", async () => {
    apiEmpresas.relaciones.mockResolvedValue({});
    apiEmpresas.delete.mockResolvedValue(undefined);
    getEmpresaActivaMock.mockReturnValue({ id: 1, nombre: "Empresa 1" });
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Eliminar"));
    await waitFor(() => expect(apiEmpresas.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(setEmpresaActivaMock).toHaveBeenCalledWith(null));
    // La rama de saneo recarga la página completa: no debe repoblar la tabla.
    expect(apiEmpresas.list).not.toHaveBeenCalled();
  });

  it("eliminar una empresa que NO es la activa no toca st_empresa", async () => {
    apiEmpresas.relaciones.mockResolvedValue({});
    apiEmpresas.delete.mockResolvedValue(undefined);
    getEmpresaActivaMock.mockReturnValue({ id: 99, nombre: "Otra" });
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Eliminar"));
    await waitFor(() => expect(apiEmpresas.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(apiEmpresas.list).toHaveBeenCalled());
    expect(setEmpresaActivaMock).not.toHaveBeenCalled();
  });

  it("deshabilitar la empresa ACTIVA en st_empresa limpia la empresa activa", async () => {
    apiEmpresas.toggleHabilitada.mockResolvedValue(mkEmpresa(1, { habilitada: false }));
    getEmpresaActivaMock.mockReturnValue({ id: 1, nombre: "Empresa 1" });
    renderCliente([mkEmpresa(1)]);
    fireEvent.click(screen.getByText("Deshabilitar"));
    await waitFor(() => expect(apiEmpresas.toggleHabilitada).toHaveBeenCalledWith(1));
    await waitFor(() => expect(setEmpresaActivaMock).toHaveBeenCalledWith(null));
    expect(apiEmpresas.list).not.toHaveBeenCalled();
  });
});
