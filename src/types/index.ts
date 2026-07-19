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

export type Cargo = 'Supervisor' | 'Trabajador' | 'Administrador';
export type TipoAlerta = 'RESPIRATORIA' | 'AJUSTE' | 'FILTRO' | 'BATERIA' | 'DESCONEXION';
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
}

export interface TrabajadorRol {
  id: { trabajador: string; rol: number };
  rol?: Rol;
}

export interface TrabajadorUbicacion {
  id: { trabajador: string; ubicacion: number };
  ubicacion?: Ubicacion;
}

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
 * - nivelAjuste: 0=Ajustado, 1=Desajustado (presion vs thFit 101740 Pa)
 * - nivelAtollo: 0=Bajo, 1=Medio, 2=Alto (presion vs thClogLow/thClogHigh)
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
