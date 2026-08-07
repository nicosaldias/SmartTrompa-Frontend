/**
 * Helper central de roles. Reemplaza las ~14 comparaciones literales de cargo
 * dispersas en guards de página y componentes: un solo punto de verdad para
 * qué puede ver cada perfil (el gating del front es cosmético — la frontera
 * real es el backend, ver src/middleware.ts).
 */
import type { Cargo } from '@/types';

/** Cargos con vista de supervisión: se conectan al WS y ven listados de gestión. */
export const ROLES_SUPERVISION: Cargo[] = ['Administrador', 'Supervisor', 'SuperAdministrador'];

export function esSuperAdmin(cargo?: string | null): boolean {
  return cargo === 'SuperAdministrador';
}

export function esTrabajador(cargo?: string | null): boolean {
  return cargo === 'Trabajador';
}

/** Administrador de su empresa o SuperAdministrador global (páginas admin-only). */
export function puedeAdministrar(cargo?: string | null): boolean {
  return cargo === 'Administrador' || cargo === 'SuperAdministrador';
}

/** Supervisor o superior: cualquier vista de gestión no exclusiva de admin. */
export function esGestor(cargo?: string | null): boolean {
  return cargo === 'Supervisor' || puedeAdministrar(cargo);
}

/** Destino post-login por cargo (antes hardcodeado en 3 sitios distintos). */
export function rutaInicial(cargo?: string | null): string {
  if (esSuperAdmin(cargo)) return '/empresas';
  if (esTrabajador(cargo)) return '/mi-historial';
  return '/resumen';
}
