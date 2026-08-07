import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import Sidebar from "../Sidebar";

// La navegación del Sidebar se arma filtrando navItems por el cargo de la
// cookie st_user: estos tests fijan qué ve cada rol tras el multitenant (F3).
vi.mock("next/navigation", () => ({ usePathname: () => "/resumen" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>{children}</a>
  ),
}));
vi.mock("@/theme/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));
vi.mock("@/actions/auth", () => ({ logoutAction: vi.fn() }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("@/components/i18n/LanguageSelector", () => ({ default: () => null }));

function conCargo(cargo: string) {
  document.cookie = `st_user=${encodeURIComponent(JSON.stringify({ rut: "1-9", cargo }))}`;
}

function linkPorHref(href: string): HTMLElement | null {
  return document.querySelector(`aside a[href="${href}"]`);
}

describe("Sidebar por rol", () => {
  beforeEach(() => {
    document.cookie = "st_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("SuperAdministrador ve /empresas y todo lo de un admin", async () => {
    conCargo("SuperAdministrador");
    render(<LanguageProvider initialLang="es"><Sidebar /></LanguageProvider>);
    await waitFor(() => expect(linkPorHref("/empresas")).toBeTruthy());
    expect(linkPorHref("/trabajadores")).toBeTruthy();
    expect(linkPorHref("/auditoria")).toBeTruthy();
    expect(linkPorHref("/resumen")).toBeTruthy();
    // No es un trabajador operativo: sin historial propio.
    expect(linkPorHref("/mi-historial")).toBeNull();
  });

  it("Administrador NO ve /empresas pero sí su gestión", async () => {
    conCargo("Administrador");
    render(<LanguageProvider initialLang="es"><Sidebar /></LanguageProvider>);
    await waitFor(() => expect(linkPorHref("/trabajadores")).toBeTruthy());
    expect(linkPorHref("/empresas")).toBeNull();
    expect(linkPorHref("/umbrales")).toBeTruthy();
  });

  it("Supervisor ve vistas de cuadrilla pero no las de admin", async () => {
    conCargo("Supervisor");
    render(<LanguageProvider initialLang="es"><Sidebar /></LanguageProvider>);
    await waitFor(() => expect(linkPorHref("/cuadrilla")).toBeTruthy());
    expect(linkPorHref("/empresas")).toBeNull();
    expect(linkPorHref("/trabajadores")).toBeNull();
    expect(linkPorHref("/auditoria")).toBeNull();
  });

  it("Trabajador solo ve su historial y ayuda", async () => {
    conCargo("Trabajador");
    render(<LanguageProvider initialLang="es"><Sidebar /></LanguageProvider>);
    await waitFor(() => expect(linkPorHref("/mi-historial")).toBeTruthy());
    expect(linkPorHref("/ayuda")).toBeTruthy();
    expect(linkPorHref("/resumen")).toBeNull();
    expect(linkPorHref("/empresas")).toBeNull();
  });
});
