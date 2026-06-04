import {
  trabajadorEndpoints,
  jornadaEndpoints,
  rolEndpoints,
  ubicacionEndpoints,
  tipoFiltroEndpoints,
  tipoRespiradorEndpoints,
  alertaHistorialEndpoints,
  alertasUmbralesEndpoints,
  ticketEndpoints,
  filterLifecycleEndpoints,
  reporteEndpoints,
  trabajadorRolEndpoints,
  trabajadorUbicacionEndpoints,
  medicionesEndpoints,
} from './endpoints';
import type {
  Trabajador,
  TrabajadorRequest,
  TrabajadorRol,
  TrabajadorUbicacion,
  JornadaTrabajo,
  AlertaHistorial,
  AlertasUmbrales,
  TipoFiltro,
  TipoRespirador,
  Rol,
  Ubicacion,
  Ticket,
  PageResponse,
  FilterStatus,
  MedicionesAmbientales,
  Ajustes,
} from '@/types';
import { getMockResponse } from './mock-data';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

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

async function mensajeError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // body no es JSON
  }
  return fallback;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 100));
    return getMockResponse(url, options.method || 'GET', options.body) as T;
  }

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

    // Refresh falló — sesión realmente expirada.
    // En el navegador, forzar la salida al login para no quedar navegando con una sesión muerta.
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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
    list: async (cookieHeader?: string): Promise<Trabajador[]> => {
      // El backend pagina /api/trabajador/ (devuelve Page<Trabajador>, no un array).
      // Pedimos un tamaño amplio y devolvemos el contenido como array plano.
      const page = await request<PageResponse<Trabajador>>(
        `${trabajadorEndpoints.all()}?page=0&size=1000`,
        { cookieHeader }
      );
      return page.content;
    },
    listPaged: (page: number = 0, size: number = 20, cookieHeader?: string) =>
      request<PageResponse<Trabajador>>(
        `${trabajadorEndpoints.all()}?page=${page}&size=${size}`,
        { cookieHeader }
      ),
    get: (rut: string, cookieHeader?: string) =>
      request<Trabajador>(trabajadorEndpoints.byRut(rut), { cookieHeader }),
    create: (data: TrabajadorRequest, imageFile?: File, cookieHeader?: string) => {
      const formData = new FormData();
      formData.append("trabajador", JSON.stringify(data));
      if (imageFile) {
        formData.append("imagen", imageFile);
      } else {
        formData.append("imagen", new Blob(), "empty.png");
      }
      return request<Trabajador>(trabajadorEndpoints.create(), {
        method: 'POST',
        body: formData,
        cookieHeader,
      });
    },
    update: (rut: string, data: Partial<TrabajadorRequest>, imageFile?: File, cookieHeader?: string) => {
      const formData = new FormData();
      formData.append("trabajador", JSON.stringify(data));
      if (imageFile) {
        formData.append("imagen", imageFile);
      } else {
        formData.append("imagen", new Blob(), "empty.png");
      }
      return request<Trabajador>(trabajadorEndpoints.update(rut), {
        method: 'PUT',
        body: formData,
        cookieHeader,
      });
    },
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
    historial: (page: number = 0, size: number = 20, params?: { supervisor?: string; inicio?: string; fin?: string }, cookieHeader?: string) => {
      const searchParams = new URLSearchParams({ page: String(page), size: String(size) });
      if (params?.supervisor) searchParams.set("supervisor", params.supervisor);
      if (params?.inicio) searchParams.set("inicio", params.inicio);
      if (params?.fin) searchParams.set("fin", params.fin);
      return request<PageResponse<JornadaTrabajo>>(
        `${jornadaEndpoints.historial()}?${searchParams.toString()}`,
        { cookieHeader }
      );
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
    update: (id: number, data: Partial<AlertaHistorial>, cookieHeader?: string) =>
      request<AlertaHistorial>(alertaHistorialEndpoints.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    resolver: (id: number, data?: { resolucion?: string; medidasTomadas?: string; resueltaPor?: string }, cookieHeader?: string) =>
      request<AlertaHistorial>(alertaHistorialEndpoints.resolver(id), {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
        cookieHeader,
      }),
    detalle: (id: number, cookieHeader?: string) =>
      request<{ alerta: AlertaHistorial; jornadaId?: number }>(alertaHistorialEndpoints.detalle(id), { cookieHeader }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(alertaHistorialEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
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
    update: (id: number, data: Partial<Ticket>, cookieHeader?: string) =>
      request<Ticket>(ticketEndpoints.byId(id), {
        method: 'PUT',
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

  umbrales: {
    list: (cookieHeader?: string) =>
      request<AlertasUmbrales[]>(alertasUmbralesEndpoints.all(), { cookieHeader }),
    byId: (id: number, cookieHeader?: string) =>
      request<AlertasUmbrales>(alertasUmbralesEndpoints.byId(id), { cookieHeader }),
    byTrabajador: (rut: string, cookieHeader?: string) =>
      request<AlertasUmbrales[]>(alertasUmbralesEndpoints.byTrabajador(rut), { cookieHeader }),
    lastByTrabajador: (rut: string, cookieHeader?: string) =>
      request<AlertasUmbrales>(alertasUmbralesEndpoints.lastByTrabajador(rut), { cookieHeader }),
    create: (data: Partial<AlertasUmbrales>, cookieHeader?: string) =>
      request<AlertasUmbrales>(alertasUmbralesEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    update: (id: number, data: Partial<AlertasUmbrales>, cookieHeader?: string) =>
      request<AlertasUmbrales>(alertasUmbralesEndpoints.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
        cookieHeader,
      }),
    delete: (id: number, cookieHeader?: string) =>
      request<void>(alertasUmbralesEndpoints.byId(id), { method: 'DELETE', cookieHeader }),
    bulk: (ruts: string[], umbrales: Partial<AlertasUmbrales>, cookieHeader?: string) =>
      request<AlertasUmbrales[]>(alertasUmbralesEndpoints.bulk(), {
        method: 'POST',
        body: JSON.stringify({ ruts, umbrales }),
        cookieHeader,
      }),
  },

  trabajadorRoles: {
    list: (cookieHeader?: string) =>
      request<TrabajadorRol[]>(trabajadorRolEndpoints.all(), { cookieHeader }),
    create: (data: { trabajador: string; rol: number }, cookieHeader?: string) =>
      request<TrabajadorRol>(trabajadorRolEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify({ id: data }),
        cookieHeader,
      }),
    delete: (data: { trabajador: string; rol: number }, cookieHeader?: string) =>
      request<void>(trabajadorRolEndpoints.byId(), {
        method: 'DELETE',
        body: JSON.stringify({ trabajador: data.trabajador, rol: data.rol }),
        cookieHeader,
      }),
  },

  trabajadorUbicaciones: {
    list: (cookieHeader?: string) =>
      request<TrabajadorUbicacion[]>(trabajadorUbicacionEndpoints.all(), { cookieHeader }),
    create: (data: { trabajador: string; ubicacion: number }, cookieHeader?: string) =>
      request<TrabajadorUbicacion>(trabajadorUbicacionEndpoints.all(), {
        method: 'POST',
        body: JSON.stringify({ id: data }),
        cookieHeader,
      }),
    delete: (data: { trabajador: string; ubicacion: number }, cookieHeader?: string) =>
      request<void>(trabajadorUbicacionEndpoints.byId(), {
        method: 'DELETE',
        body: JSON.stringify({ trabajador: data.trabajador, ubicacion: data.ubicacion }),
        cookieHeader,
      }),
  },

  mediciones: {
    byJornada: (id: number, cookieHeader?: string) =>
      request<MedicionesAmbientales[]>(medicionesEndpoints.byJornada(id), { cookieHeader }),
    latestByJornada: async (id: number, cookieHeader?: string): Promise<MedicionesAmbientales | null> => {
      try {
        const all = await request<MedicionesAmbientales[]>(medicionesEndpoints.byJornada(id), { cookieHeader });
        return all.length > 0 ? all[all.length - 1] : null;
      } catch {
        return null;
      }
    },
    ajustesByJornada: (id: number, cookieHeader?: string) =>
      request<Ajustes>(medicionesEndpoints.ajustesByJornada(id), { cookieHeader }),
  },

  reportes: {
    jornada: async (idJornada: number) => {
      if (MOCK_MODE) return new Blob(['Reporte de jornada (demo)'], { type: 'application/pdf' });
      const res = await fetch(reporteEndpoints.jornada(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idJornada }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'Error al generar el reporte de jornada'));
      return res.blob();
    },
    cuadrilla: async (rutSupervisor: string, desde: string, hasta: string) => {
      if (MOCK_MODE) return new Blob(['Reporte de cuadrilla (demo)'], { type: 'application/pdf' });
      const res = await fetch(reporteEndpoints.cuadrilla(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rutSupervisor, desde, hasta }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'Error al generar el reporte de cuadrilla'));
      return res.blob();
    },
    trabajador: async (rutTrabajador: string, desde: string, hasta: string) => {
      if (MOCK_MODE) return new Blob(['Reporte de trabajador (demo)'], { type: 'application/pdf' });
      const res = await fetch(reporteEndpoints.trabajador(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rutTrabajador, desde, hasta }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'Error al generar el reporte de trabajador'));
      return res.blob();
    },
    general: async (desde: string, hasta: string) => {
      if (MOCK_MODE) return new Blob(['Reporte general (demo)'], { type: 'application/pdf' });
      const res = await fetch(reporteEndpoints.general(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde, hasta }),
      });
      if (!res.ok) throw new Error(await mensajeError(res, 'Error al generar el reporte general'));
      return res.blob();
    },
  },
};

export default api;
