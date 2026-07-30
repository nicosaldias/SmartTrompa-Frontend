import type { MedicionesAmbientales, NivelAlerta, TipoAlerta } from "@/types";

// Contrato de los mensajes STOMP del backend (pneumapi realtime/*Event.java).
// Ver docs/specs/2026-07-30-tiempo-real-websocket.md (paraguas SmartTrompa).

export interface JornadaEventMsg {
  tipo: "INICIADA" | "FINALIZADA";
  id: number;
  rutUsuario?: string | null;
  idSupervisor?: string | null;
  inicio?: string | null;
  fin?: string | null;
  dispositivo?: string | null;
}

export interface AlertaEventMsg {
  tipo: "CREADA" | "RESUELTA";
  id: number;
  tipoAlerta?: TipoAlerta | null;
  nivel?: NivelAlerta | null;
  rutTrabajador?: string | null;
  jornadaId?: number | null;
  activa?: boolean | null;
}

export interface MedicionesEventMsg {
  jornadaId: number;
  cantidad: number;
  ultima?: MedicionesAmbientales | null;
}
