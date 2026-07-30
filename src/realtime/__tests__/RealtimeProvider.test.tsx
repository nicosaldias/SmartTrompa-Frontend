import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import {
  RealtimeProvider,
  useRealtime,
  useRealtimeStatus,
  wsUrlFromApi,
} from "../RealtimeProvider";

// Doble del cliente STOMP: captura la config y los subscribe para simular
// conexión y mensajes entrantes sin abrir sockets. Vive en vi.hoisted porque
// la factory de vi.mock se iza al tope del módulo.
const { clientInstances, FakeStompClient } = vi.hoisted(() => {
  interface HoistedConfig {
    brokerURL: string;
    reconnectDelay: number;
    onConnect?: () => void;
    onWebSocketClose?: () => void;
    onStompError?: () => void;
  }

  class FakeStompClient {
    config: HoistedConfig;
    reconnectDelay: number;
    activated = false;
    subscriptions = new Map<string, (message: { body: string }) => void>();

    constructor(config: HoistedConfig) {
      this.config = config;
      this.reconnectDelay = config.reconnectDelay;
      instances.push(this);
    }
    activate() {
      this.activated = true;
    }
    deactivate() {
      return Promise.resolve();
    }
    subscribe(destination: string, callback: (message: { body: string }) => void) {
      this.subscriptions.set(destination, callback);
      return { unsubscribe: () => this.subscriptions.delete(destination) };
    }
  }
  const instances: FakeStompClient[] = [];
  return { clientInstances: instances, FakeStompClient };
});
type FakeStompClient = InstanceType<typeof FakeStompClient>;

vi.mock("@stomp/stompjs", () => ({ Client: FakeStompClient }));

function setUserCookie(cargo: string | null) {
  if (cargo === null) {
    document.cookie = "st_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    return;
  }
  document.cookie = `st_user=${encodeURIComponent(JSON.stringify({ nombre: "Test", cargo }))}`;
}

function Status() {
  const status = useRealtimeStatus();
  return <span data-testid="status">{status}</span>;
}

describe("wsUrlFromApi", () => {
  it("deriva ws://.../ws desde la URL http del API, descartando /api", () => {
    expect(wsUrlFromApi("http://localhost:8080/api")).toBe("ws://localhost:8080/ws");
  });

  it("deriva wss:// desde https, conservando el puerto", () => {
    expect(wsUrlFromApi("https://udec.c4i-udec.cl:18091/api")).toBe(
      "wss://udec.c4i-udec.cl:18091/ws"
    );
  });

  it("devuelve null con base vacía o inválida", () => {
    expect(wsUrlFromApi("")).toBeNull();
    expect(wsUrlFromApi("no-es-una-url")).toBeNull();
  });
});

describe("RealtimeProvider", () => {
  beforeEach(() => {
    clientInstances.length = 0;
  });

  it("no conecta si la sesión es de un Trabajador", () => {
    setUserCookie("Trabajador");
    render(
      <RealtimeProvider>
        <Status />
      </RealtimeProvider>
    );
    expect(clientInstances).toHaveLength(0);
    expect(screen.getByTestId("status").textContent).toBe("offline");
  });

  it("no conecta sin cookie de sesión", () => {
    setUserCookie(null);
    render(
      <RealtimeProvider>
        <Status />
      </RealtimeProvider>
    );
    expect(clientInstances).toHaveLength(0);
  });

  it("con un Administrador conecta, se suscribe a los 3 topics y pasa a live", async () => {
    setUserCookie("Administrador");
    render(
      <RealtimeProvider>
        <Status />
      </RealtimeProvider>
    );
    expect(clientInstances).toHaveLength(1);
    const client = clientInstances[0];
    expect(client.activated).toBe(true);
    expect(client.config.brokerURL).toBe("ws://localhost:8080/ws");

    act(() => client.config.onConnect?.());

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("live");
    });
    expect([...client.subscriptions.keys()].sort()).toEqual([
      "/topic/alertas",
      "/topic/jornadas",
      "/topic/mediciones",
    ]);
  });

  it("entrega cada mensaje parseado al handler de su topic y vuelve a offline al cerrarse", async () => {
    setUserCookie("Supervisor");
    const recibidos: unknown[] = [];
    function Consumidor() {
      useRealtime("alertas", (payload) => recibidos.push(payload));
      return null;
    }
    render(
      <RealtimeProvider>
        <Status />
        <Consumidor />
      </RealtimeProvider>
    );
    const client = clientInstances[0];
    act(() => client.config.onConnect?.());

    act(() => {
      client.subscriptions.get("/topic/alertas")?.({
        body: JSON.stringify({ tipo: "CREADA", id: 7 }),
      });
      // Un frame corrupto no debe romper ni llegar al handler.
      client.subscriptions.get("/topic/alertas")?.({ body: "{no-json" });
      client.subscriptions.get("/topic/jornadas")?.({
        body: JSON.stringify({ tipo: "INICIADA", id: 1 }),
      });
    });

    expect(recibidos).toEqual([{ tipo: "CREADA", id: 7 }]);

    act(() => client.config.onWebSocketClose?.());
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("offline");
    });
  });

  it("espacia la reconexión tras 5 cierres seguidos y la restablece al conectar", () => {
    setUserCookie("Administrador");
    render(<RealtimeProvider>{null}</RealtimeProvider>);
    const client = clientInstances[0];

    for (let i = 0; i < 5; i++) {
      act(() => client.config.onWebSocketClose?.());
    }
    expect(client.reconnectDelay).toBe(30_000);

    act(() => client.config.onConnect?.());
    expect(client.reconnectDelay).toBe(5_000);
  });
});
