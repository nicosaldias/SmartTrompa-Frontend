/**
 * Utilidad para leer cookies del lado del cliente.
 */

interface UserCookie {
  nombre?: string;
  cargo?: string;
  rut?: string;
}

export function getUserFromCookie(): UserCookie | null {
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith('st_user='));
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('=')));
  } catch {
    return null;
  }
}
