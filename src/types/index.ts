// Types centralizados — alineados con entidades reales de pneumapi

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type Cargo = 'Supervisor' | 'Trabajador' | 'Administrador' | 'SuperAdministrador';

// Tenant: los usuarios y catálogos pertenecen a una empresa; el
// SuperAdministrador (empresa null) opera globalmente sobre todas.
export interface Empresa {
  id: number;
  nombre: string;
  rutEmpresa: string;
  habilitada: boolean;
  createdAt?: string;
  updatedAt?: string;
}
// FILTRO = saturación instantánea (sensor, durante la jornada);
// FILTRO_VIDA_UTIL = desgaste acumulado en horas (job del backend, sin jornada asociada).
export type TipoAlerta = 'RESPIRATORIA' | 'AJUSTE' | 'FILTRO' | 'FILTRO_VIDA_UTIL' | 'BATERIA' | 'DESCONEXION';
export type NivelAlerta = 'OK' | 'ALERTA' | 'CRITICO';

// Tipos binarios: solo NORMAL o CRITICO (si hay alerta, siempre es critica)
export const BINARY_ALERT_TYPES: TipoAlerta[] = ['RESPIRATORIA', 'AJUSTE', 'DESCONEXION'];
// Tipos ternarios: OK, ALERTA, CRITICO
export const TERNARY_ALERT_TYPES: TipoAlerta[] = ['FILTRO', 'BATERIA'];
export type EstadoEquipamiento = 'NUEVO' | 'USADO';
export type EstadoTicket = 'ABIERTO' | 'EN_PROGRESO' | 'CERRADO';

export interface Trabajador {
  rut: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  cargo: Cargo;
  activo: boolean;
  correo: string;
  tieneImagen?: boolean;
  empresa?: Empresa | null;
  trabajadorRols?: TrabajadorRol[];
  trabajadorUbicacions?: TrabajadorUbicacion[];
}

export interface TrabajadorRequest {
  rut: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  cargo: Cargo;
  correo: string;
  password?: string;
  // Solo el SuperAdministrador puede elegir empresa; para el resto el backend
  // fuerza la del actor (payload ajeno → 403).
  empresa?: { id: number } | null;
}

export interface TrabajadorRol {
  id: { trabajador: string; rol: number };
  rol?: Rol;
}

export interface TrabajadorUbicacion {
  id: { trabajador: string; ubicacion: number };
  ubicacion?: Ubicacion;
}

// Desenlace de la calibración pre-jornada (V12): cómo terminó, no cuántas veces se intentó.
export type OrigenCalibracion = 'MANUAL' | 'AUTOMATICA' | 'OMITIDA';

export interface JornadaTrabajo {
  id: number;
  rutUsuario: string;
  idSupervisor: string;
  idFiltro?: number;
  idRespirador?: number;
  ubicacion?: Ubicacion;
  rol?: Rol;
  inicio: string;
  fin?: string;
  dispositivo?: string;
  estadoRespirador?: EstadoEquipamiento;
  estadoFiltro?: EstadoEquipamiento;
  terminada: boolean;
  origenCalibracion?: OrigenCalibracion | null;
  // Contador denormalizado de intentos de calibración (V15). Mismo criterio
  // NULL-vs-hecho que V12: NULL/ausente = app vieja que no registraba,
  // 0 = omitió sin intentar, N = cantidad de intentos.
  intentosCalibracion?: number | null;
}

/**
 * Un intento de calibración pre-jornada (1 fila por pulsación de "Calibrar
 * sensor" en la app). GET /jornada-trabajo/{id}/calibracion-intentos/,
 * ordenado por numero (1-based, cronológico).
 */
export interface CalibracionIntento {
  numero: number;
  exitosa: boolean;
  vcalPa: number | null;
  rangoPa: number | null;
  motivoDescarte: string | null;
  avisos: string | null;
  iniciadoEn: string | null;
  duracionMs: number | null;
}

export interface AlertaHistorial {
  id: number;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  rutTrabajador: string;
  jornadaId?: number;
  timestamp: string;
  descripcion?: string;
  valorMedido?: number;
  activa: boolean;
  trabajador?: Trabajador;
  resolucion?: string;
  medidasTomadas?: string;
  resueltaEn?: string;
  resueltaPor?: string;
}

/**
 * Datos de sensores BLE leidos por la app movil.
 * - temperatura: °C (sensor BLE bytes 0-3)
 * - presion: Pa (sensor BLE bytes 4-7, base 26700)
 * - humedad: % (sensor BLE bytes 8-11)
 * - bateria: % (sensor BLE caracteristica 1)
 * - frecuenciaRespiratoria: bpm (calculado por peak detection en presion)
 * - nivelAjuste: 1=Ajustado, 0=Desajustado (convencion D3, la de la app movil)
 * - nivelAtollo: % de saturacion 0-100 predicho por ML on-device (D4);
 *   -1/null = sin dato (primeros ~10 min de jornada). Cortes visuales 60/80.
 * - counter: acumulador de desajuste (contDisj de la app movil)
 */
export interface MedicionesAmbientales {
  id: number;
  timestamp: string;
  temperatura?: number;
  presion?: number;
  humedad?: number;
  bateria?: number;
  frecuenciaRespiratoria?: number;
  nivelAjuste?: number;
  nivelAtollo?: number;
  counter?: number;
  jornadaId?: number;
}

export interface TipoFiltro {
  id: number;
  nombre?: string;
  marca: string;
  modelo: string;
  fechaHomologacion?: string;
  habilitado: boolean;
  descripcion?: string;
  // La imagen ya no viaja en el JSON; se sirve por GET /{id}/imagen/ y este
  // flag (calculado en BD) indica si existe.
  tieneImagen?: boolean;
  vidaUtilHoras?: number;
}

export interface FilterStatus {
  trabajadorRut: string;
  trabajadorNombre: string;
  tipoFiltro: string;
  tipoFiltroId: number;
  horasUsadas: number;
  horasMaximas: number;
  porcentajeUso: number;
  nivelAlerta: 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'VENCIDO';
  tieneImagen: boolean;
}

export interface Tanda {
  jornadaId: number;
  inicio: string;
  fin: string | null;
  horasReales: number;
  excluida: boolean;
  motivoExclusion: string | null;
  excluidoPor: string | null;
  excluidoEn: string | null;
  activa: boolean;
}

export interface DesgloseFiltro {
  trabajadorRut: string;
  trabajadorNombre: string;
  tipoFiltro: string;
  tipoFiltroId: number;
  horasUsadas: number;
  horasMaximas: number;
  porcentajeUso: number;
  nivelAlerta: string;
  tieneImagen: boolean;
  tandas: Tanda[];
}

export interface TipoRespirador {
  id: number;
  nombre?: string;
  marca: string;
  modelo: string;
  fechaHomologacion?: string;
  habilitado: boolean;
  descripcion?: string;
  // La imagen ya no viaja en el JSON; se sirve por GET /{id}/imagen/ y este
  // flag (calculado en BD) indica si existe.
  tieneImagen?: boolean;
}

export interface Rol {
  id: number;
  nombreRol: string;
  descripcion?: string;
  habilitado: boolean;
}

export interface Ubicacion {
  id: number;
  nombre: string;
  edificio?: string;
  piso?: number;
  descripcion?: string;
  habilitado: boolean;
}

export interface Ticket {
  id: number;
  asunto: string;
  descripcion: string;
  estado: EstadoTicket;
  creadoEn: string;
  rutTrabajador?: string;
  trabajador?: Trabajador;
}

export interface Ajustes {
  ajustado: number;
  desajustado: number;
}

/** Conteo de registros relacionados que se borrarian en cascada (advertencia previa al borrado). */
export interface RelacionesResumen {
  jornadas: number;
  mediciones: number;
  alertas: number;
  otros: number;
  total: number;
}

// Bitácora append-only del backend (V11). resultado: OK | ERROR | DENEGADO.
export interface AuditLogEntry {
  id: number;
  actorRut: string | null;
  actorCargo: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: string | null;
  resultado: "OK" | "ERROR" | "DENEGADO";
  origen: string | null;
  timestamp: string;
  // Empresa del actor al momento del evento (denormalizada, D14). Null en
  // registros previos al multitenant o de actores sin empresa.
  empresaId?: number | null;
}

export interface AlertasUmbrales {
  id: number;
  alrtRespAlto?: number;
  alrtRespBajo?: number;
  alrtAjus?: number;
  alrtFiltrAlto?: number;
  alrtFiltrBajo?: number;
  alrtBateAlto?: number;
  alrtBateMedio?: number;
  alrtBateBajo?: number;
  fechaAlerta?: string;
  rutTrabajador?: string;
}
