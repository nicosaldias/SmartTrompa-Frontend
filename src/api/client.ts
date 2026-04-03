import {
  trabajadorEndpoints,
  jornadaEndpoints,
  rolEndpoints,
  ubicacionEndpoints,
  tipoFiltroEndpoints,
  tipoRespiradorEndpoints,
  alertaHistorialEndpoints,
  ticketEndpoints,
  filterLifecycleEndpoints,
  reporteEndpoints,
} from './endpoints';
import type {
  Trabajador,
  TrabajadorRequest,
  JornadaTrabajo,
  AlertaHistorial,
  TipoFiltro,
  TipoRespirador,
  Rol,
  Ubicacion,
  Ticket,
  PageResponse,
  FilterStatus,
} from '@/types';

interface RequestOptions extends RequestInit {
  cookieHeader?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh tokens by calling the refresh endpoint.
 * Returns true if refresh succeeded, false otherwise.
 */
async function attemptRefresh(cookieHeader?: string): Promise<boolean> {
  try {
    const res = await fetch(trabajadorEndpoints.refresh(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { cookieHeader, headers, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(headers || {}),
    },
    ...rest,
  });

  // On 401, attempt to refresh tokens and retry the original request once
  if (res.status === 401) {
    // Avoid multiple simultaneous refresh calls
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = attemptRefresh(cookieHeader);
    }

    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry the original request with fresh tokens
      const retryRes = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(headers || {}),
        },
        ...rest,
      });

      if (!retryRes.ok) {
        const errorData = await retryRes.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || errorData.error || `Request failed with status ${retryRes.status}`);
      }

      if (retryRes.status === 204) {
        return Promise.resolve(undefined as T);
      }

      const text = await retryRes.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    }

    // Refresh failed — throw to trigger login redirect
    throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || errorData.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return Promise.resolve(undefined as T);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  trabajadores: {
    list: (cookieHeader?: string) =>
      request<Trabajador[]>(trabajadorEndpoints.all(), { cookieHeader }),
    listPaged: (page: number = 0, size: number = 20, cookieHeader?: string) =>
      request<PageResponse<Trabajador>>(
        `${trabajadorEndpoints.all()}?page=${page}&size=${size}`,
        { cookieHeader }
      ),
    get: (rut: string, cookieHeader?: string) =>
      request<Trabajador>(trabajadorEndpoints.byRut(rut), { cookieHeader }),
    create: (data: TrabajadorRequest, cookieHeader?: string) =>
      request<Trabajador>(trabajadorEndpoints.create(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    update: (rut: string, data: Partial<TrabajadorRequest>, cookieHeader?: string) =>
      request<Trabajador>(trabajadorEndpoints.update(rut), {
        method: 'PUT',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    toggleActivo: (rut: string, cookieHeader?: string) =>
      request<Trabajador>(trabajadorEndpoints.toggleActivo(rut), {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (rut: string, cookieHeader?: string) =>
      request<void>(trabajadorEndpoints.delete(rut), { method: 'DELETE', cookieHeader }),
    supervisados: (rut: string, cookieHeader?: string) =>
      request<Trabajador[]>(trabajadorEndpoints.supervisados(rut), { cookieHeader }),
  },

  jornadas: {
    list: (cookieHeader?: string) =>
      request<JornadaTrabajo[]>(jornadaEndpoints.all(), { cookieHeader }),
    listPaged: (page: number = 0, size: number = 20, cookieHeader?: string) =>
      request<PageResponse<JornadaTrabajo>>(
        `${jornadaEndpoints.all()}?page=${page}&size=${size}`,
        { cookieHeader }
      ),
    byId: (id: number, cookieHeader?: string) =>
      request<JornadaTrabajo>(jornadaEndpoints.byId(id), { cookieHeader }),
    activas: (cookieHeader?: string) =>
      request<JornadaTrabajo[]>(jornadaEndpoints.activas(), { cookieHeader }),
    byUsuario: (rut: string, cookieHeader?: string) =>
      request<JornadaTrabajo[]>(jornadaEndpoints.byUsuario(rut), { cookieHeader }),
    bySupervisor: (rut: string, params?: { inicio?: string; fin?: string }, cookieHeader?: string) => {
      let url = jornadaEndpoints.bySupervisor(rut);
      if (params?.inicio && params?.fin) {
        url += `?inicio=${params.inicio}&fin=${params.fin}`;
      }
      return request<JornadaTrabajo[]>(url, { cookieHeader });
    },
  },

  alertas: {
    list: (params?: Record<string, string>, cookieHeader?: string) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return request<AlertaHistorial[]>(
        `${alertaHistorialEndpoints.all()}${qs ? '?' + qs : ''}`,
        { cookieHeader }
      );
    },
    listPaged: (page: number = 0, size: number = 20, params?: Record<string, string>, cookieHeader?: string) => {
      const allParams = new URLSearchParams({ page: String(page), size: String(size), ...params });
      return request<PageResponse<AlertaHistorial>>(
        `${alertaHistorialEndpoints.all()}?${allParams.toString()}`,
        { cookieHeader }
      );
    },
    activas: (cookieHeader?: string) =>
      request<AlertaHistorial[]>(alertaHistorialEndpoints.activas(), { cookieHeader }),
    byTrabajador: (rut: string, cookieHeader?: string) =>
      request<AlertaHistorial[]>(alertaHistorialEndpoints.byTrabajador(rut), { cookieHeader }),
    activasByTrabajador: (rut: string, cookieHeader?: string) =>
      request<AlertaHistorial[]>(alertaHistorialEndpoints.activasByTrabajador(rut), { cookieHeader }),
    byJornada: (id: number, cookieHeader?: string) =>
      request<AlertaHistorial[]>(alertaHistorialEndpoints.byJornada(id), { cookieHeader }),
    create: (data: Partial<AlertaHistorial>, cookieHeader?: string) =>
      request<AlertaHistorial>(alertaHistorialEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
  },

  roles: {
    list: (cookieHeader?: string) =>
      request<Rol[]>(rolEndpoints.all(), { cookieHeader }),
    create: (data: Partial<Rol>, cookieHeader?: string) =>
      request<Rol>(rolEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    update: (id: number, data: Partial<Rol>, cookieHeader?: string) =>
      request<Rol>(rolEndpoints.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    toggleHabilitado: (id: number, cookieHeader?: string) =>
      request<Rol>(rolEndpoints.toggleHabilitado(id), {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(rolEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
  },

  ubicaciones: {
    list: (cookieHeader?: string) =>
      request<Ubicacion[]>(ubicacionEndpoints.all(), { cookieHeader }),
    create: (data: Partial<Ubicacion>, cookieHeader?: string) =>
      request<Ubicacion>(ubicacionEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    update: (id: number, data: Partial<Ubicacion>, cookieHeader?: string) =>
      request<Ubicacion>(ubicacionEndpoints.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    toggleHabilitado: (id: number, cookieHeader?: string) =>
      request<Ubicacion>(ubicacionEndpoints.toggleHabilitado(id), {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(ubicacionEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
  },

  tipoFiltros: {
    list: (cookieHeader?: string) =>
      request<TipoFiltro[]>(tipoFiltroEndpoints.all(), { cookieHeader }),
    listWithImages: (cookieHeader?: string) =>
      request<TipoFiltro[]>(tipoFiltroEndpoints.withImages(), { cookieHeader }),
    byId: (id: number, cookieHeader?: string) =>
      request<TipoFiltro>(tipoFiltroEndpoints.byId(id), { cookieHeader }),
    create: (formData: FormData, cookieHeader?: string) =>
      request<TipoFiltro>(tipoFiltroEndpoints.all(), {
        method: 'POST',
        body: formData,
        cookieHeader,
      }),
    update: (id: number, formData: FormData, cookieHeader?: string) =>
      request<TipoFiltro>(tipoFiltroEndpoints.byId(id), {
        method: 'PUT',
        body: formData,
        cookieHeader,
      }),
    toggleHabilitado: (id: number, cookieHeader?: string) =>
      request<TipoFiltro>(tipoFiltroEndpoints.toggleHabilitado(id), {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(tipoFiltroEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
  },

  tipoRespiradores: {
    list: (cookieHeader?: string) =>
      request<TipoRespirador[]>(tipoRespiradorEndpoints.all(), { cookieHeader }),
    listWithImages: (cookieHeader?: string) =>
      request<TipoRespirador[]>(tipoRespiradorEndpoints.withImages(), { cookieHeader }),
    byId: (id: number, cookieHeader?: string) =>
      request<TipoRespirador>(tipoRespiradorEndpoints.byId(id), { cookieHeader }),
    create: (formData: FormData, cookieHeader?: string) =>
      request<TipoRespirador>(tipoRespiradorEndpoints.all(), {
        method: 'POST',
        body: formData,
        cookieHeader,
      }),
    update: (id: number, formData: FormData, cookieHeader?: string) =>
      request<TipoRespirador>(tipoRespiradorEndpoints.byId(id), {
        method: 'PUT',
        body: formData,
        cookieHeader,
      }),
    toggleHabilitado: (id: number, cookieHeader?: string) =>
      request<TipoRespirador>(tipoRespiradorEndpoints.toggleHabilitado(id), {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(tipoRespiradorEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
  },

  tickets: {
    list: (cookieHeader?: string) =>
      request<Ticket[]>(ticketEndpoints.all(), { cookieHeader }),
    listPaged: (page: number = 0, size: number = 20, cookieHeader?: string) =>
      request<PageResponse<Ticket>>(
        `${ticketEndpoints.all()}?page=${page}&size=${size}`,
        { cookieHeader }
      ),
    byTrabajador: (rut: string, cookieHeader?: string) =>
      request<Ticket[]>(ticketEndpoints.byTrabajador(rut), { cookieHeader }),
    create: (data: Partial<Ticket>, cookieHeader?: string) =>
      request<Ticket>(ticketEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    cambiarEstado: (id: number, estado: string, cookieHeader?: string) =>
      request<Ticket>(`${ticketEndpoints.cambiarEstado(id)}?estado=${estado}`, {
        method: 'PATCH',
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(ticketEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
  },

  filterLifecycle: {
    estado: (cookieHeader?: string) =>
      request<FilterStatus[]>(filterLifecycleEndpoints.estado(), { cookieHeader }),
    estadoByRut: (rut: string, cookieHeader?: string) =>
      request<FilterStatus>(filterLifecycleEndpoints.estadoByRut(rut), { cookieHeader }),
    proximosVencer: (cookieHeader?: string) =>
      request<FilterStatus[]>(filterLifecycleEndpoints.proximosVencer(), { cookieHeader }),
  },

  reportes: {
    descargarSemanal: async (desde: string, hasta: string, cookieHeader?: string) => {
      const url = reporteEndpoints.semanal(desde, hasta);
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });
      if (!res.ok) throw new Error('Error al generar el reporte semanal');
      return res.blob();
    },
    descargarMensual: async (year: number, month: number, cookieHeader?: string) => {
      const url = reporteEndpoints.mensual(year, month);
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });
      if (!res.ok) throw new Error('Error al generar el reporte mensual');
      return res.blob();
    },
  },
};

export default api;
