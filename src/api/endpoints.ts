export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const trabajadorEndpoints = {
  all: () => `${API_BASE_URL}/trabajador/`,
  byRut: (rut: string) => `${API_BASE_URL}/trabajador/${rut}/`,
  create: () => `${API_BASE_URL}/trabajador/create-user/`,
  update: (rut: string) => `${API_BASE_URL}/trabajador/${rut}/`,
  toggleActivo: (rut: string) => `${API_BASE_URL}/trabajador/${rut}/activo/`,
  delete: (rut: string) => `${API_BASE_URL}/trabajador/${rut}/`,
  imagen: (rut: string) => `${API_BASE_URL}/trabajador/${rut}/imagen/`,
  login: () => `${API_BASE_URL}/trabajador/login/`,
  logout: () => `${API_BASE_URL}/trabajador/logout/`,
  token: () => `${API_BASE_URL}/trabajador/token/`,
  supervisados: (rut: string) => `${API_BASE_URL}/trabajador/supervisados/${rut}/`,
  forgotPassword: () => `${API_BASE_URL}/trabajador/forgot-password/`,
  resetPassword: () => `${API_BASE_URL}/trabajador/reset-password/`,
  refresh: () => `${API_BASE_URL}/trabajador/refresh/`,
};

export const jornadaEndpoints = {
  all: () => `${API_BASE_URL}/jornada-trabajo/`,
  byId: (id: number) => `${API_BASE_URL}/jornada-trabajo/${id}/`,
  activas: () => `${API_BASE_URL}/jornada-trabajo/activas/`,
  byUsuario: (rut: string) => `${API_BASE_URL}/jornada-trabajo/usuario/${rut}/`,
  bySupervisor: (rut: string) => `${API_BASE_URL}/jornada-trabajo/supervisor/${rut}/`,
  historial: () => `${API_BASE_URL}/jornada-trabajo/historial/`,
};

export const rolEndpoints = {
  all: () => `${API_BASE_URL}/rol/`,
  byId: (id: number) => `${API_BASE_URL}/rol/${id}/`,
  toggleHabilitado: (id: number) => `${API_BASE_URL}/rol/${id}/habilitado/`,
};

export const ubicacionEndpoints = {
  all: () => `${API_BASE_URL}/ubicacion/`,
  byId: (id: number) => `${API_BASE_URL}/ubicacion/${id}/`,
  toggleHabilitado: (id: number) => `${API_BASE_URL}/ubicacion/${id}/habilitado/`,
};

export const tipoFiltroEndpoints = {
  all: () => `${API_BASE_URL}/tipo-filtro/`,
  withImages: () => `${API_BASE_URL}/tipo-filtro/images/`,
  byId: (id: number) => `${API_BASE_URL}/tipo-filtro/${id}/`,
  toggleHabilitado: (id: number) => `${API_BASE_URL}/tipo-filtro/${id}/habilitado/`,
};

export const tipoRespiradorEndpoints = {
  all: () => `${API_BASE_URL}/tipo-respirador/`,
  withImages: () => `${API_BASE_URL}/tipo-respirador/images/`,
  byId: (id: number) => `${API_BASE_URL}/tipo-respirador/${id}/`,
  toggleHabilitado: (id: number) => `${API_BASE_URL}/tipo-respirador/${id}/habilitado/`,
};

export const alertaHistorialEndpoints = {
  all: () => `${API_BASE_URL}/alertas-historial/`,
  byId: (id: number) => `${API_BASE_URL}/alertas-historial/${id}/`,
  activas: () => `${API_BASE_URL}/alertas-historial/activas/`,
  byTrabajador: (rut: string) => `${API_BASE_URL}/alertas-historial/trabajador/${rut}/`,
  activasByTrabajador: (rut: string) => `${API_BASE_URL}/alertas-historial/trabajador/${rut}/activas/`,
  byJornada: (id: number) => `${API_BASE_URL}/alertas-historial/jornada/${id}/`,
  resolver: (id: number) => `${API_BASE_URL}/alertas-historial/${id}/resolver/`,
  detalle: (id: number) => `${API_BASE_URL}/alertas-historial/${id}/detalle/`,
};

export const medicionesEndpoints = {
  byJornada: (id: number) => `${API_BASE_URL}/mediciones-ambientales/jornada/${id}/`,
};

export const alertasUmbralesEndpoints = {
  all: () => `${API_BASE_URL}/alertas-umbrales/`,
  byId: (id: number) => `${API_BASE_URL}/alertas-umbrales/${id}/`,
  byTrabajador: (rut: string) => `${API_BASE_URL}/alertas-umbrales/trabajador/${rut}/`,
  lastByTrabajador: (rut: string) => `${API_BASE_URL}/alertas-umbrales/trabajador/last/${rut}/`,
};

export const trabajadorRolEndpoints = {
  all: () => `${API_BASE_URL}/trabajador-rol/`,
  byId: () => `${API_BASE_URL}/trabajador-rol/id/`,
};

export const trabajadorUbicacionEndpoints = {
  all: () => `${API_BASE_URL}/trabajador-ubicacion/`,
  byId: () => `${API_BASE_URL}/trabajador-ubicacion/id/`,
};

export const ticketEndpoints = {
  all: () => `${API_BASE_URL}/ticket/`,
  byId: (id: number) => `${API_BASE_URL}/ticket/${id}/`,
  byTrabajador: (rut: string) => `${API_BASE_URL}/ticket/trabajador/${rut}/`,
  cambiarEstado: (id: number) => `${API_BASE_URL}/ticket/${id}/estado/`,
};

export const filterLifecycleEndpoints = {
  estado: () => `${API_BASE_URL}/filtros/estado/`,
  estadoByRut: (rut: string) => `${API_BASE_URL}/filtros/estado/${rut}/`,
  proximosVencer: () => `${API_BASE_URL}/filtros/proximos-vencer/`,
};

export const reporteEndpoints = {
  semanal: (desde: string, hasta: string) =>
    `${API_BASE_URL}/reportes/semanal/?desde=${desde}&hasta=${hasta}`,
  mensual: (year: number, month: number) =>
    `${API_BASE_URL}/reportes/mensual/?year=${year}&month=${month}`,
  porJornada: (desde: string, hasta: string) =>
    `${API_BASE_URL}/reportes/jornada/?desde=${desde}&hasta=${hasta}`,
};
