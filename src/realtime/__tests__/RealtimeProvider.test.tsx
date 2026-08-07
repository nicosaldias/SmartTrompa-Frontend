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

// Desde la auditoría 2026-08-07 el canal es namespaced-only: sin empresa
// resuelta NO se conecta (nada de topics legacy globales). La cookie lleva
// empresaId como en las sesiones reales post-multitenant.
function setUserCookie(cargo: string | null, empresaId: number | null = 7) {
  if (cargo === null) {
    document.cookie = "st_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    return;
  }
  document.cookie = `st_user=${encodeURIComponent(
    JSON.stringify({ nombre: "Test", cargo, empresaId })
  )}`;
}

function setEmpresaActiva(id: number | null) {
  if (id === null) {
    document.cookie = "st_empresa=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    return;
  }
  document.cookie = `st_empresa=${encodeURIComponent(JSON.stringify({ id, nombre: "Empresa" }))}`;
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
    setUserCookie(null);
    setEmpresaActiva(null);
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

  it("gestor SIN empresaId (cookie pre-multitenant): no conecta ni cae a topics legacy", () => {
    // Tras V14 el único cargo sin empresa es el SuperAdministrador; una
    // sesión vieja sin empresaId queda offline hasta el próximo login.
    setUserCookie("Administrador", null);
    render(
      <RealtimeProvider>
        <Status />
      </RealtimeProvider>
    );
    expect(clientInstances).toHaveLength(0);
    expect(screen.getByTestId("status").textContent).toBe("offline");
  });

  it("superadmin sin empresa activa: no conecta (no hay canal que mirar)", () => {
    setUserCookie("SuperAdministrador", null);
    render(<RealtimeProvider>{null}</RealtimeProvider>);
    expect(clientInstances).toHaveLength(0);
  });

  it("superadmin con empresa activa: suscribe el namespace de ESA empresa", () => {
    setUserCookie("SuperAdministrador", null);
    setEmpresaActiva(3);
    render(<RealtimeProvider>{null}</RealtimeProvider>);
    expect(clientInstances).toHaveLength(1);
    const client = clientInstances[0];
    act(() => client.config.onConnect?.());
    expect([...client.subscriptions.keys()].sort()).toEqual([
      "/topic/empresa/3/alertas",
      "/topic/empresa/3/jornadas",
      "/topic/empresa/3/mediciones",
    ]);
  });

  it("con un Administrador conecta, se suscribe a los 3 topics de su empresa y pasa a live", async () => {
    setUserCookie("Administrador", 7);
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
      "/topic/empresa/7/alertas",
      "/topic/empresa/7/jornadas",
      "/topic/empresa/7/mediciones",
    ]);
  });

  it("entrega cada mensaje parseado al handler de su topic y vuelve a offline al cerrarse", async () => {
    setUserCookie("Supervisor", 7);
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
      client.subscriptions.get("/topic/empresa/7/alertas")?.({
        body: JSON.stringify({ tipo: "CREADA", id: 7 }),
      });
      // Un frame corrupto no debe romper ni llegar al handler.
      client.subscriptions.get("/topic/empresa/7/alertas")?.({ body: "{no-json" });
      client.subscriptions.get("/topic/empresa/7/jornadas")?.({
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
    setUserCookie("Administrador", 7);
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
