/**
 * Utilidad para leer cookies del lado del cliente.
 */

interface UserCookie {
  nombre?: string;
  cargo?: string;
  rut?: string;
  empresaId?: number | null;
  empresaNombre?: string | null;
}

/** Empresa sobre la que opera el SuperAdministrador (cookie st_empresa, D6). */
export interface EmpresaActiva {
  id: number;
  nombre: string;
}

function leerCookieJson<T>(nombre: string): T | null {
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${nombre}=`));
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('=')));
  } catch {
    return null;
  }
}

export function getUserFromCookie(): UserCookie | null {
  return leerCookieJson<UserCookie>('st_user');
}

export function getEmpresaActivaFromCookie(): EmpresaActiva | null {
  const empresa = leerCookieJson<EmpresaActiva>('st_empresa');
  return empresa && empresa.id != null ? empresa : null;
}
