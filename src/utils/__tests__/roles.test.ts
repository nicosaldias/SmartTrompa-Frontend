import { describe, it, expect } from "vitest";
import {
  esSuperAdmin,
  esTrabajador,
  puedeAdministrar,
  esGestor,
  rutaInicial,
  ROLES_SUPERVISION,
} from "../roles";

// El helper es el punto único de verdad del gating por cargo (multitenant F3):
// estos tests fijan la matriz de permisos para que un refactor no la corra.
describe("roles", () => {
  it("esSuperAdmin solo acepta SuperAdministrador", () => {
    expect(esSuperAdmin("SuperAdministrador")).toBe(true);
    expect(esSuperAdmin("Administrador")).toBe(false);
    expect(esSuperAdmin("Supervisor")).toBe(false);
    expect(esSuperAdmin("Trabajador")).toBe(false);
    expect(esSuperAdmin(null)).toBe(false);
    expect(esSuperAdmin(undefined)).toBe(false);
  });

  it("puedeAdministrar: Administrador y SuperAdministrador", () => {
    expect(puedeAdministrar("Administrador")).toBe(true);
    expect(puedeAdministrar("SuperAdministrador")).toBe(true);
    expect(puedeAdministrar("Supervisor")).toBe(false);
    expect(puedeAdministrar("Trabajador")).toBe(false);
    expect(puedeAdministrar(null)).toBe(false);
  });

  it("esGestor: Supervisor o superior", () => {
    expect(esGestor("Supervisor")).toBe(true);
    expect(esGestor("Administrador")).toBe(true);
    expect(esGestor("SuperAdministrador")).toBe(true);
    expect(esGestor("Trabajador")).toBe(false);
    expect(esGestor(undefined)).toBe(false);
  });

  it("esTrabajador solo acepta Trabajador", () => {
    expect(esTrabajador("Trabajador")).toBe(true);
    expect(esTrabajador("Supervisor")).toBe(false);
    expect(esTrabajador(null)).toBe(false);
  });

  it("rutaInicial enruta por cargo (superadmin a /empresas)", () => {
    expect(rutaInicial("SuperAdministrador")).toBe("/empresas");
    expect(rutaInicial("Trabajador")).toBe("/mi-historial");
    expect(rutaInicial("Administrador")).toBe("/resumen");
    expect(rutaInicial("Supervisor")).toBe("/resumen");
    // Cargo desconocido/ausente degrada al dashboard general, nunca a una 404.
    expect(rutaInicial(undefined)).toBe("/resumen");
  });

  it("ROLES_SUPERVISION incluye al SuperAdministrador (WS realtime)", () => {
    expect(ROLES_SUPERVISION).toContain("SuperAdministrador");
    expect(ROLES_SUPERVISION).toContain("Administrador");
    expect(ROLES_SUPERVISION).toContain("Supervisor");
    expect(ROLES_SUPERVISION).not.toContain("Trabajador");
  });
});
