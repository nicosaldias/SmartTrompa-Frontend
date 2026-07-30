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
import { getUserFromCookie } from "@/utils/cookies";

// Canal en vivo backend→web (STOMP sobre WebSocket). Es una mejora sobre el
// polling de 30 s, nunca su reemplazo: si el socket no está "live", cada vista
// sigue actualizándose con su intervalo de siempre.
export type RealtimeTopic = "jornadas" | "alertas" | "mediciones";
export type RealtimeStatus = "live" | "offline";

const TOPICS: RealtimeTopic[] = ["jornadas", "alertas", "mediciones"];
// El backend rechaza SUBSCRIBE de otros cargos; no intentamos conectar.
const ROLES_SUPERVISION = new Set(["Administrador", "Supervisor"]);
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
    const cargo = getUserFromCookie()?.cargo;
    if (
      !brokerURL ||
      process.env.NEXT_PUBLIC_MOCK_MODE === "true" ||
      !cargo ||
      !ROLES_SUPERVISION.has(cargo)
    ) {
      return;
    }

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
          client.subscribe(`/topic/${topic}`, (message: IMessage) => {
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
