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
  ubicacion?: Ubicacion;
  rol?: Rol;
  tipoFiltro?: TipoFiltro;
  tipoRespirador?: TipoRespirador;
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
}

export interface TipoFiltro {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  fechaHomologacion?: string;
  habilitado: boolean;
  descripcion?: string;
  imagen?: string | null;
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
  nombre: string;
  marca: string;
  modelo: string;
  fechaHomologacion?: string;
  habilitado: boolean;
  descripcion?: string;
  imagen?: string | null;
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
