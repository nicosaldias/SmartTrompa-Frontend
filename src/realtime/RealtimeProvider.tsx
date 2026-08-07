"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "@/api/endpoints";
import { getEmpresaActivaFromCookie, getUserFromCookie } from "@/utils/cookies";
import { ROLES_SUPERVISION, esSuperAdmin } from "@/utils/roles";

// Canal en vivo backend→web (STOMP sobre WebSocket). Es una mejora sobre el
// polling de 30 s, nunca su reemplazo: si el socket no está "live", cada vista
// sigue actualizándose con su intervalo de siempre.
export type RealtimeTopic = "jornadas" | "alertas" | "mediciones";
export type RealtimeStatus = "live" | "offline";

const TOPICS: RealtimeTopic[] = ["jornadas", "alertas", "mediciones"];
const RECONNECT_MS = 5_000;
const RECONNECT_LENTO_MS = 30_000;
const FALLOS_PARA_ESPACIAR = 5;

// El endpoint STOMP vive en la raíz del backend (/ws), no bajo /api.
export function wsUrlFromApi(apiBase: string): string | null {
  if (!apiBase) return null;
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

type Handler = (payload: unknown) => void;

interface RealtimeContextValue {
  status: RealtimeStatus;
  subscribe: (topic: RealtimeTopic, handler: Handler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "offline",
  subscribe: () => () => {},
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>("offline");
  const handlersRef = useRef<Map<RealtimeTopic, Set<Handler>>>(
    new Map(TOPICS.map((topic) => [topic, new Set()]))
  );

  const subscribe = useCallback((topic: RealtimeTopic, handler: Handler) => {
    handlersRef.current.get(topic)?.add(handler);
    return () => {
      handlersRef.current.get(topic)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    const brokerURL = wsUrlFromApi(API_BASE_URL);
    const user = getUserFromCookie();
    const cargo = user?.cargo;
    if (
      !brokerURL ||
      process.env.NEXT_PUBLIC_MOCK_MODE === "true" ||
      !cargo ||
      // El backend rechaza SUBSCRIBE de otros cargos; no intentamos conectar.
      !(ROLES_SUPERVISION as readonly string[]).includes(cargo)
    ) {
      return;
    }

    // Namespace por empresa (F2-C): el interceptor del backend solo permite
    // suscribirse a /topic/empresa/{id}/* de la propia empresa (el superadmin
    // a cualquiera), así que resolvemos la empresa ANTES de abrir el socket.
    let empresaId: number | null;
    if (esSuperAdmin(cargo)) {
      // El superadmin mira la empresa que tenga activada (cookie st_empresa).
      // Sin empresa activa no hay canal que mirar: no conectamos y el badge
      // queda en offline (cada vista sigue con su polling de 30 s).
      empresaId = getEmpresaActivaFromCookie()?.id ?? null;
      if (empresaId === null) return;
    } else {
      empresaId = user?.empresaId ?? null;
    }

    // Mapeo canal lógico → destino STOMP. Con empresa resuelta, el topic
    // namespaced; sin empresa (usuario legacy aún sin migrar), los topics
    // globales del modo transición D8 (solo emiten eventos de la empresa 1).
    const destinoDe = (topic: RealtimeTopic): string =>
      empresaId !== null
        ? `/topic/empresa/${empresaId}/${topic}`
        : `/topic/${topic}`;

    let fallosSeguidos = 0;
    const client = new Client({
      brokerURL,
      reconnectDelay: RECONNECT_MS,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      debug: () => {},
      onConnect: () => {
        fallosSeguidos = 0;
        client.reconnectDelay = RECONNECT_MS;
        setStatus("live");
        for (const topic of TOPICS) {
          // Los handlers siguen colgados del canal lógico: el contrato de
          // useRealtime("jornadas"|...) no cambia para los consumidores.
          client.subscribe(destinoDe(topic), (message: IMessage) => {
            let payload: unknown;
            try {
              payload = JSON.parse(message.body);
            } catch {
              return;
            }
            handlersRef.current.get(topic)?.forEach((handler) => handler(payload));
          });
        }
      },
      onWebSocketClose: () => {
        setStatus("offline");
        // Si el entorno no soporta el upgrade (proxy viejo), no martillar cada 5 s.
        fallosSeguidos += 1;
        if (fallosSeguidos >= FALLOS_PARA_ESPACIAR) {
          client.reconnectDelay = RECONNECT_LENTO_MS;
        }
      },
      onStompError: () => setStatus("offline"),
    });
    client.activate();

    return () => {
      setStatus("offline");
      void client.deactivate();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ status, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeContext).status;
}

// El handler va en un ref: el consumidor puede pasar una función nueva por
// render sin resuscribirse ni exigir useCallback en el sitio de uso.
export function useRealtime<T = unknown>(
  topic: RealtimeTopic,
  handler: (payload: T) => void
): void {
  const { subscribe } = useContext(RealtimeContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(
    () => subscribe(topic, (payload) => handlerRef.current(payload as T)),
    [subscribe, topic]
  );
}
