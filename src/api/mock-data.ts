import type {
  Trabajador, JornadaTrabajo, AlertaHistorial, MedicionesAmbientales,
  AlertasUmbrales, TipoFiltro, TipoRespirador, Rol, Ubicacion,
  Ticket, FilterStatus, TrabajadorRol, TrabajadorUbicacion, PageResponse,
} from '@/types';

// ===== Date helpers =====
const NOW = new Date();
const todayAt = (h: number, m = 0) => {
  const d = new Date(NOW); d.setHours(h, m, 0, 0); return d.toISOString();
};
const daysAgo = (n: number, h = 8, m = 0) => {
  const d = new Date(NOW); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString();
};
const minutesAgo = (mins: number) => {
  const d = new Date(NOW); d.setMinutes(d.getMinutes() - mins); return d.toISOString();
};

// ===== ROLES =====
export const MOCK_ROLES: Rol[] = [
  { id: 1, nombreRol: 'Operador de maquinaria', descripcion: 'Manejo de maquinaria pesada y equipos industriales', habilitado: true },
  { id: 2, nombreRol: 'Soldador', descripcion: 'Trabajos de soldadura y corte', habilitado: true },
  { id: 3, nombreRol: 'Técnico eléctrico', descripcion: 'Mantenimiento e instalaciones eléctricas', habilitado: true },
  { id: 4, nombreRol: 'Supervisor de turno', descripcion: 'Supervisión de personal y operaciones', habilitado: true },
];

// ===== UBICACIONES =====
export const MOCK_UBICACIONES: Ubicacion[] = [
  { id: 1, nombre: 'Taller Mecánico', edificio: 'Planta A', piso: 1, descripcion: 'Área de mantenimiento mecánico', habilitado: true },
  { id: 2, nombre: 'Sala de Soldadura', edificio: 'Planta A', piso: 2, descripcion: 'Área de soldadura y corte', habilitado: true },
  { id: 3, nombre: 'Área Eléctrica', edificio: 'Planta B', piso: 1, descripcion: 'Sala de tableros y conexiones', habilitado: true },
  { id: 4, nombre: 'Patio de Carga', edificio: 'Exterior', piso: 0, descripcion: 'Zona de carga y descarga', habilitado: true },
];

// ===== TRABAJADORES =====
export const MOCK_TRABAJADORES: Trabajador[] = [
  { rut: '12.345.678-5', nombre: 'Carlos', apellidoPaterno: 'Muñoz', apellidoMaterno: 'Sepúlveda', cargo: 'Administrador', activo: true, correo: 'carlos.munoz@demo.cl' },
  { rut: '13.456.789-0', nombre: 'María', apellidoPaterno: 'González', apellidoMaterno: 'Herrera', cargo: 'Supervisor', activo: true, correo: 'maria.gonzalez@demo.cl' },
  { rut: '14.567.890-1', nombre: 'Juan', apellidoPaterno: 'Pérez', apellidoMaterno: 'Contreras', cargo: 'Supervisor', activo: true, correo: 'juan.perez@demo.cl' },
  { rut: '15.678.901-2', nombre: 'Pedro', apellidoPaterno: 'Soto', apellidoMaterno: 'Villanueva', cargo: 'Trabajador', activo: true, correo: 'pedro.soto@demo.cl' },
  { rut: '16.789.012-3', nombre: 'Ana', apellidoPaterno: 'López', apellidoMaterno: 'Fuentes', cargo: 'Trabajador', activo: true, correo: 'ana.lopez@demo.cl' },
  { rut: '17.890.123-4', nombre: 'Luis', apellidoPaterno: 'Martínez', apellidoMaterno: 'Bravo', cargo: 'Trabajador', activo: true, correo: 'luis.martinez@demo.cl' },
  { rut: '18.901.234-5', nombre: 'José', apellidoPaterno: 'Hernández', apellidoMaterno: 'Rojas', cargo: 'Trabajador', activo: true, correo: 'jose.hernandez@demo.cl' },
  { rut: '19.012.345-6', nombre: 'Rosa', apellidoPaterno: 'Díaz', apellidoMaterno: 'Morales', cargo: 'Trabajador', activo: false, correo: 'rosa.diaz@demo.cl' },
];

// ===== TIPO FILTRO =====
export const MOCK_TIPO_FILTROS: TipoFiltro[] = [
  { id: 1, nombre: '3M 2091', marca: '3M', modelo: '2091 P100', fechaHomologacion: '2024-03-15T00:00:00Z', habilitado: true, descripcion: 'Filtro de partículas P100', tieneImagen: false, vidaUtilHoras: 200 },
  { id: 2, nombre: '3M 6003', marca: '3M', modelo: '6003', fechaHomologacion: '2024-01-20T00:00:00Z', habilitado: true, descripcion: 'Cartucho vapores orgánicos y gases ácidos', tieneImagen: false, vidaUtilHoras: 200 },
  { id: 3, nombre: 'MSA Advantage', marca: 'MSA', modelo: 'Advantage GME', fechaHomologacion: '2023-11-10T00:00:00Z', habilitado: true, descripcion: 'Cartucho multigas industrial', tieneImagen: false, vidaUtilHoras: 150 },
];

// ===== TIPO RESPIRADOR =====
export const MOCK_TIPO_RESPIRADORES: TipoRespirador[] = [
  { id: 1, nombre: '3M 6800', marca: '3M', modelo: '6800', fechaHomologacion: '2024-02-01T00:00:00Z', habilitado: true, descripcion: 'Respirador cara completa serie 6000', tieneImagen: false },
  { id: 2, nombre: '3M 7502', marca: '3M', modelo: '7502', fechaHomologacion: '2024-01-15T00:00:00Z', habilitado: true, descripcion: 'Respirador media cara serie 7500', tieneImagen: false },
  { id: 3, nombre: 'MSA Advantage 3200', marca: 'MSA', modelo: 'Advantage 3200', fechaHomologacion: '2023-10-01T00:00:00Z', habilitado: true, descripcion: 'Respirador cara completa doble cartucho', tieneImagen: false },
];

// ===== JORNADAS =====
const JORNADAS_ACTIVAS: JornadaTrabajo[] = [
  { id: 1, rutUsuario: '15.678.901-2', idSupervisor: '13.456.789-0', idFiltro: 1, idRespirador: 1, ubicacion: MOCK_UBICACIONES[0], rol: MOCK_ROLES[0], inicio: todayAt(8, 0), terminada: false, dispositivo: 'SENSOR-001', estadoRespirador: 'USADO', estadoFiltro: 'USADO' },
  { id: 2, rutUsuario: '16.789.012-3', idSupervisor: '13.456.789-0', idFiltro: 2, idRespirador: 2, ubicacion: MOCK_UBICACIONES[2], rol: MOCK_ROLES[2], inicio: todayAt(7, 30), terminada: false, dispositivo: 'SENSOR-002', estadoRespirador: 'NUEVO', estadoFiltro: 'USADO' },
  { id: 3, rutUsuario: '17.890.123-4', idSupervisor: '14.567.890-1', idFiltro: 3, idRespirador: 3, ubicacion: MOCK_UBICACIONES[3], rol: MOCK_ROLES[1], inicio: todayAt(9, 0), terminada: false, dispositivo: 'SENSOR-003', estadoRespirador: 'USADO', estadoFiltro: 'NUEVO' },
];

const JORNADAS_TERMINADAS: JornadaTrabajo[] = [
  { id: 4, rutUsuario: '15.678.901-2', idSupervisor: '13.456.789-0', idFiltro: 1, idRespirador: 1, ubicacion: MOCK_UBICACIONES[0], rol: MOCK_ROLES[0], inicio: daysAgo(1, 8), fin: daysAgo(1, 17), terminada: true, dispositivo: 'SENSOR-001', estadoRespirador: 'USADO', estadoFiltro: 'USADO' },
  { id: 5, rutUsuario: '18.901.234-5', idSupervisor: '14.567.890-1', idFiltro: 2, idRespirador: 2, ubicacion: MOCK_UBICACIONES[1], rol: MOCK_ROLES[1], inicio: daysAgo(2, 7), fin: daysAgo(2, 16, 30), terminada: true, dispositivo: 'SENSOR-004', estadoRespirador: 'NUEVO', estadoFiltro: 'USADO' },
  { id: 6, rutUsuario: '16.789.012-3', idSupervisor: '13.456.789-0', idFiltro: 2, idRespirador: 2, ubicacion: MOCK_UBICACIONES[2], rol: MOCK_ROLES[2], inicio: daysAgo(3, 8), fin: daysAgo(3, 16), terminada: true, dispositivo: 'SENSOR-002', estadoRespirador: 'USADO', estadoFiltro: 'USADO' },
  { id: 7, rutUsuario: '17.890.123-4', idSupervisor: '14.567.890-1', idFiltro: 3, idRespirador: 3, ubicacion: MOCK_UBICACIONES[3], rol: MOCK_ROLES[1], inicio: daysAgo(4, 9), fin: daysAgo(4, 17, 30), terminada: true, dispositivo: 'SENSOR-003', estadoRespirador: 'USADO', estadoFiltro: 'USADO' },
];

export const MOCK_JORNADAS: JornadaTrabajo[] = [...JORNADAS_ACTIVAS, ...JORNADAS_TERMINADAS];

// ===== ALERTAS =====
export const MOCK_ALERTAS: AlertaHistorial[] = [
  { id: 1, tipo: 'RESPIRATORIA', nivel: 'ALERTA', rutTrabajador: '15.678.901-2', jornadaId: 1, timestamp: minutesAgo(15), activa: true, descripcion: 'Frecuencia respiratoria elevada', valorMedido: 28, trabajador: MOCK_TRABAJADORES[3] },
  { id: 2, tipo: 'BATERIA', nivel: 'CRITICO', rutTrabajador: '17.890.123-4', jornadaId: 3, timestamp: minutesAgo(5), activa: true, descripcion: 'Nivel de batería crítico', valorMedido: 8, trabajador: MOCK_TRABAJADORES[5] },
  { id: 3, tipo: 'AJUSTE', nivel: 'ALERTA', rutTrabajador: '16.789.012-3', jornadaId: 2, timestamp: minutesAgo(10), activa: true, descripcion: 'Respirador desajustado', valorMedido: 1, trabajador: MOCK_TRABAJADORES[4] },
  { id: 4, tipo: 'FILTRO', nivel: 'ALERTA', rutTrabajador: '15.678.901-2', jornadaId: 1, timestamp: minutesAgo(25), activa: true, descripcion: 'Nivel de saturación elevado', valorMedido: 0.85, trabajador: MOCK_TRABAJADORES[3] },
  { id: 5, tipo: 'DESCONEXION', nivel: 'CRITICO', rutTrabajador: '17.890.123-4', jornadaId: 3, timestamp: minutesAgo(3), activa: true, descripcion: 'Pérdida de señal del sensor', trabajador: MOCK_TRABAJADORES[5] },
  { id: 6, tipo: 'RESPIRATORIA', nivel: 'OK', rutTrabajador: '18.901.234-5', jornadaId: 5, timestamp: daysAgo(2, 10, 30), activa: false, descripcion: 'Frecuencia respiratoria normalizada', valorMedido: 16, trabajador: MOCK_TRABAJADORES[6], resolucion: 'Se regularizó actividad', medidasTomadas: 'Descanso de 15 minutos', resueltaEn: daysAgo(2, 10, 45), resueltaPor: '14.567.890-1' },
  { id: 7, tipo: 'BATERIA', nivel: 'ALERTA', rutTrabajador: '15.678.901-2', jornadaId: 4, timestamp: daysAgo(1, 14), activa: false, descripcion: 'Batería baja', valorMedido: 18, trabajador: MOCK_TRABAJADORES[3], resolucion: 'Sensor recargado', medidasTomadas: 'Cambio de turno para recarga', resueltaEn: daysAgo(1, 14, 30), resueltaPor: '13.456.789-0' },
  { id: 8, tipo: 'AJUSTE', nivel: 'OK', rutTrabajador: '16.789.012-3', jornadaId: 2, timestamp: minutesAgo(45), activa: false, descripcion: 'Ajuste corregido', valorMedido: 0, trabajador: MOCK_TRABAJADORES[4], resolucion: 'Reajuste realizado', medidasTomadas: 'Verificación visual', resueltaEn: minutesAgo(40), resueltaPor: '13.456.789-0' },
];

// ===== MEDICIONES AMBIENTALES =====
function genMediciones(jornadaId: number, count: number, cfg: { temp: number; hum: number; bat: number; resp: number; ajuste: number; atollo: number }): MedicionesAmbientales[] {
  return Array.from({ length: count }, (_, i) => ({
    id: jornadaId * 100 + i + 1,
    timestamp: minutesAgo((count - i) * 5),
    temperatura: +(cfg.temp + Math.sin(i * 0.5) * 1.5).toFixed(1),
    presion: +(101325 + Math.sin(i * 0.3) * 100).toFixed(0),
    humedad: +(cfg.hum + Math.sin(i * 0.4) * 3).toFixed(1),
    bateria: Math.max(5, cfg.bat - i * 2),
    frecuenciaRespiratoria: +(cfg.resp + Math.sin(i * 0.6) * 3).toFixed(1),
    nivelAjuste: cfg.ajuste,
    nivelAtollo: cfg.atollo,
    counter: i + 1,
    jornadaId,
  }));
}

const MOCK_MEDICIONES: Record<number, MedicionesAmbientales[]> = {
  1: genMediciones(1, 20, { temp: 23, hum: 57, bat: 75, resp: 18, ajuste: 0, atollo: 0 }),
  2: genMediciones(2, 20, { temp: 26, hum: 63, bat: 45, resp: 20, ajuste: 1, atollo: 0 }),
  3: genMediciones(3, 20, { temp: 31, hum: 42, bat: 8, resp: 22, ajuste: 0, atollo: 1 }),
};

// ===== UMBRALES =====
export const MOCK_UMBRALES: AlertasUmbrales[] = [
  { id: 1, rutTrabajador: '15.678.901-2', alrtRespAlto: 25, alrtRespBajo: 10, alrtAjus: 0.5, alrtFiltrAlto: 0.9, alrtFiltrBajo: 0.3, alrtBateAlto: 80, alrtBateMedio: 40, alrtBateBajo: 15, fechaAlerta: todayAt(0) },
  { id: 2, rutTrabajador: '16.789.012-3', alrtRespAlto: 25, alrtRespBajo: 10, alrtAjus: 0.5, alrtFiltrAlto: 0.9, alrtFiltrBajo: 0.3, alrtBateAlto: 80, alrtBateMedio: 40, alrtBateBajo: 15, fechaAlerta: todayAt(0) },
  { id: 3, rutTrabajador: '17.890.123-4', alrtRespAlto: 25, alrtRespBajo: 10, alrtAjus: 0.5, alrtFiltrAlto: 0.9, alrtFiltrBajo: 0.3, alrtBateAlto: 80, alrtBateMedio: 40, alrtBateBajo: 15, fechaAlerta: todayAt(0) },
];

// ===== TICKETS =====
export const MOCK_TICKETS: Ticket[] = [
  { id: 1, asunto: 'Falla sensor temperatura', descripcion: 'Sensor SENSOR-001 muestra lecturas inconsistentes desde las 10:00', estado: 'ABIERTO', creadoEn: minutesAgo(120), rutTrabajador: '15.678.901-2', trabajador: MOCK_TRABAJADORES[3] },
  { id: 2, asunto: 'Solicitud cambio de filtro', descripcion: 'Filtro 3M 6003 presenta resistencia elevada, solicito reemplazo', estado: 'EN_PROGRESO', creadoEn: daysAgo(1, 11), rutTrabajador: '16.789.012-3', trabajador: MOCK_TRABAJADORES[4] },
  { id: 3, asunto: 'Calibración sensor presión', descripcion: 'Sensor de presión requiere calibración mensual', estado: 'CERRADO', creadoEn: daysAgo(3, 9), rutTrabajador: '18.901.234-5', trabajador: MOCK_TRABAJADORES[6] },
  { id: 4, asunto: 'Error lectura batería', descripcion: 'Lectura de batería SENSOR-003 oscila entre 8% y 50%', estado: 'ABIERTO', creadoEn: minutesAgo(30), rutTrabajador: '17.890.123-4', trabajador: MOCK_TRABAJADORES[5] },
];

// ===== FILTER STATUS =====
export const MOCK_FILTER_STATUS: FilterStatus[] = [
  { trabajadorRut: '15.678.901-2', trabajadorNombre: 'Pedro Soto Villanueva', tipoFiltro: '3M 2091 P100', tipoFiltroId: 1, horasUsadas: 145, horasMaximas: 200, porcentajeUso: 72.5, nivelAlerta: 'OK', tieneImagen: false },
  { trabajadorRut: '16.789.012-3', trabajadorNombre: 'Ana López Fuentes', tipoFiltro: '3M 6003', tipoFiltroId: 2, horasUsadas: 180, horasMaximas: 200, porcentajeUso: 90, nivelAlerta: 'ADVERTENCIA', tieneImagen: false },
  { trabajadorRut: '17.890.123-4', trabajadorNombre: 'Luis Martínez Bravo', tipoFiltro: 'MSA Advantage GME', tipoFiltroId: 3, horasUsadas: 195, horasMaximas: 200, porcentajeUso: 97.5, nivelAlerta: 'CRITICO', tieneImagen: false },
];

// ===== TRABAJADOR-ROL =====
export const MOCK_TRABAJADOR_ROLES: TrabajadorRol[] = [
  { id: { trabajador: '15.678.901-2', rol: 1 }, rol: MOCK_ROLES[0] },
  { id: { trabajador: '16.789.012-3', rol: 3 }, rol: MOCK_ROLES[2] },
  { id: { trabajador: '17.890.123-4', rol: 2 }, rol: MOCK_ROLES[1] },
  { id: { trabajador: '13.456.789-0', rol: 4 }, rol: MOCK_ROLES[3] },
  { id: { trabajador: '14.567.890-1', rol: 4 }, rol: MOCK_ROLES[3] },
];

// ===== TRABAJADOR-UBICACION =====
export const MOCK_TRABAJADOR_UBICACIONES: TrabajadorUbicacion[] = [
  { id: { trabajador: '15.678.901-2', ubicacion: 1 }, ubicacion: MOCK_UBICACIONES[0] },
  { id: { trabajador: '16.789.012-3', ubicacion: 3 }, ubicacion: MOCK_UBICACIONES[2] },
  { id: { trabajador: '17.890.123-4', ubicacion: 4 }, ubicacion: MOCK_UBICACIONES[3] },
  { id: { trabajador: '13.456.789-0', ubicacion: 1 }, ubicacion: MOCK_UBICACIONES[0] },
  { id: { trabajador: '14.567.890-1', ubicacion: 3 }, ubicacion: MOCK_UBICACIONES[2] },
];

// ===== HELPERS =====
function createPageResponse<T>(items: T[], page: number, size: number): PageResponse<T> {
  const p = isNaN(page) ? 0 : page;
  const s = isNaN(size) || size <= 0 ? 20 : size;
  const start = p * s;
  const content = items.slice(start, start + s);
  return { content, totalElements: items.length, totalPages: Math.ceil(items.length / s), number: p, size: s, first: p === 0, last: start + s >= items.length, empty: content.length === 0 };
}

function handleMutation(path: string, body?: BodyInit | null): unknown {
  if (body && typeof body === 'string') {
    try { return JSON.parse(body); } catch { /* FormData */ }
  }
  if (path.startsWith('/trabajador')) return MOCK_TRABAJADORES[0];
  if (path.startsWith('/rol')) return MOCK_ROLES[0];
  if (path.startsWith('/ubicacion')) return MOCK_UBICACIONES[0];
  if (path.startsWith('/tipo-filtro')) return MOCK_TIPO_FILTROS[0];
  if (path.startsWith('/tipo-respirador')) return MOCK_TIPO_RESPIRADORES[0];
  if (path.startsWith('/alertas-historial')) return MOCK_ALERTAS[0];
  if (path.startsWith('/alertas-umbrales')) return MOCK_UMBRALES[0];
  if (path.startsWith('/ticket')) return MOCK_TICKETS[0];
  return {};
}

// ===== MOCK ROUTER =====
export function getMockResponse(url: string, method: string, body?: BodyInit | null): unknown {
  const apiIdx = url.indexOf('/api/');
  const afterApi = apiIdx >= 0 ? url.substring(apiIdx + 4) : url;
  const [rawPath, qs] = afterApi.split('?');
  // Normalize: remove trailing slash
  const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  const params = new URLSearchParams(qs || '');

  // ---- MUTATIONS ----
  if (method === 'DELETE') return undefined;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return handleMutation(path, body);

  // ---- GET ROUTES ----

  // Trabajadores
  if (path === '/trabajador') {
    return params.has('page') ? createPageResponse(MOCK_TRABAJADORES, +params.get('page')!, +params.get('size')!) : MOCK_TRABAJADORES;
  }
  if (path === '/trabajador/token') return MOCK_TRABAJADORES[0];
  if (path.match(/^\/trabajador\/supervisados\/.+$/)) return MOCK_TRABAJADORES.filter(t => t.cargo === 'Trabajador');
  if (path.match(/^\/trabajador\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[2]);
    return MOCK_TRABAJADORES.find(t => t.rut === rut) || MOCK_TRABAJADORES[0];
  }

  // Jornadas
  if (path === '/jornada-trabajo') {
    return params.has('page') ? createPageResponse(MOCK_JORNADAS, +params.get('page')!, +params.get('size')!) : MOCK_JORNADAS;
  }
  if (path === '/jornada-trabajo/activas') return JORNADAS_ACTIVAS;
  if (path === '/jornada-trabajo/historial') return createPageResponse(MOCK_JORNADAS, +(params.get('page') || 0), +(params.get('size') || 20));
  if (path.match(/^\/jornada-trabajo\/supervisor\/.+$/)) return MOCK_JORNADAS;
  if (path.match(/^\/jornada-trabajo\/usuario\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_JORNADAS.filter(j => j.rutUsuario === rut);
  }
  if (path.match(/^\/jornada-trabajo\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_JORNADAS.find(j => j.id === id) || MOCK_JORNADAS[0];
  }

  // Alertas historial
  if (path === '/alertas-historial') {
    return params.has('page') ? createPageResponse(MOCK_ALERTAS, +params.get('page')!, +params.get('size')!) : MOCK_ALERTAS;
  }
  if (path === '/alertas-historial/activas') return MOCK_ALERTAS.filter(a => a.activa);
  if (path.match(/^\/alertas-historial\/trabajador\/.+\/activas$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_ALERTAS.filter(a => a.rutTrabajador === rut && a.activa);
  }
  if (path.match(/^\/alertas-historial\/trabajador\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_ALERTAS.filter(a => a.rutTrabajador === rut);
  }
  if (path.match(/^\/alertas-historial\/\d+\/detalle$/)) {
    const id = +path.split('/')[2];
    const alerta = MOCK_ALERTAS.find(a => a.id === id) || MOCK_ALERTAS[0];
    return { alerta, jornadaId: alerta.jornadaId };
  }
  if (path.match(/^\/alertas-historial\/jornada\/\d+$/)) {
    const id = +path.split('/')[3];
    return MOCK_ALERTAS.filter(a => a.jornadaId === id);
  }
  if (path.match(/^\/alertas-historial\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_ALERTAS.find(a => a.id === id) || MOCK_ALERTAS[0];
  }

  // Mediciones ambientales
  if (path.match(/^\/mediciones-ambientales\/jornada\/\d+$/)) {
    const id = +path.split('/')[3];
    return MOCK_MEDICIONES[id] || [];
  }

  // Alertas umbrales
  if (path === '/alertas-umbrales') return MOCK_UMBRALES;
  if (path.match(/^\/alertas-umbrales\/trabajador\/last\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[4]);
    return MOCK_UMBRALES.find(u => u.rutTrabajador === rut) || null;
  }
  if (path.match(/^\/alertas-umbrales\/trabajador\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_UMBRALES.filter(u => u.rutTrabajador === rut);
  }
  if (path.match(/^\/alertas-umbrales\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_UMBRALES.find(u => u.id === id) || MOCK_UMBRALES[0];
  }

  // Roles
  if (path === '/rol') return MOCK_ROLES;
  if (path.match(/^\/rol\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_ROLES.find(r => r.id === id) || MOCK_ROLES[0];
  }

  // Ubicaciones
  if (path === '/ubicacion') return MOCK_UBICACIONES;
  if (path.match(/^\/ubicacion\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_UBICACIONES.find(u => u.id === id) || MOCK_UBICACIONES[0];
  }

  // Tipo filtro
  if (path === '/tipo-filtro' || path === '/tipo-filtro/images') return MOCK_TIPO_FILTROS;
  if (path.match(/^\/tipo-filtro\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_TIPO_FILTROS.find(f => f.id === id) || MOCK_TIPO_FILTROS[0];
  }

  // Tipo respirador
  if (path === '/tipo-respirador' || path === '/tipo-respirador/images') return MOCK_TIPO_RESPIRADORES;
  if (path.match(/^\/tipo-respirador\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_TIPO_RESPIRADORES.find(r => r.id === id) || MOCK_TIPO_RESPIRADORES[0];
  }

  // Tickets
  if (path === '/ticket') {
    return params.has('page') ? createPageResponse(MOCK_TICKETS, +params.get('page')!, +params.get('size')!) : MOCK_TICKETS;
  }
  if (path.match(/^\/ticket\/trabajador\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_TICKETS.filter(t => t.rutTrabajador === rut);
  }
  if (path.match(/^\/ticket\/\d+$/)) {
    const id = +path.split('/')[2];
    return MOCK_TICKETS.find(t => t.id === id) || MOCK_TICKETS[0];
  }

  // Filter lifecycle
  if (path === '/filtros/estado') return MOCK_FILTER_STATUS;
  if (path.match(/^\/filtros\/estado\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    return MOCK_FILTER_STATUS.find(f => f.trabajadorRut === rut) || MOCK_FILTER_STATUS[0];
  }
  if (path === '/filtros/proximos-vencer') return MOCK_FILTER_STATUS.filter(f => f.nivelAlerta !== 'OK');
  if (path.match(/^\/filtros\/desglose\/.+$/)) {
    const rut = decodeURIComponent(path.split('/')[3]);
    const base = MOCK_FILTER_STATUS.find(f => f.trabajadorRut === rut) || MOCK_FILTER_STATUS[0];
    const ahora = Date.now();
    return {
      trabajadorRut: base.trabajadorRut,
      trabajadorNombre: base.trabajadorNombre,
      tipoFiltro: base.tipoFiltro,
      tipoFiltroId: base.tipoFiltroId,
      horasUsadas: base.horasUsadas,
      horasMaximas: base.horasMaximas,
      porcentajeUso: base.porcentajeUso,
      nivelAlerta: base.nivelAlerta,
      tieneImagen: false,
      tandas: [
        { jornadaId: 1, inicio: new Date(ahora - 3 * 86400000).toISOString(), fin: new Date(ahora - 3 * 86400000 + 4 * 3600000).toISOString(), horasReales: 4, excluida: false, motivoExclusion: null, excluidoPor: null, excluidoEn: null, activa: false },
        { jornadaId: 2, inicio: new Date(ahora - 2 * 86400000).toISOString(), fin: new Date(ahora - 2 * 86400000 + 4 * 3600000).toISOString(), horasReales: 4, excluida: false, motivoExclusion: null, excluidoPor: null, excluidoEn: null, activa: false },
      ],
    };
  }
  if (path.match(/^\/filtros\/jornada\/\d+\/excluir\/?$/)) {
    return undefined; // POST/DELETE en demo: no-op
  }

  // Trabajador-rol / Trabajador-ubicacion
  if (path === '/trabajador-rol') return MOCK_TRABAJADOR_ROLES;
  if (path === '/trabajador-ubicacion') return MOCK_TRABAJADOR_UBICACIONES;

  // Default
  return [];
}
