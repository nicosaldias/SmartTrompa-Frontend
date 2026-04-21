"use client";

import { useState, useEffect } from "react";
import { api } from "@/api/client";
import type { Ticket, EstadoTicket, Cargo } from "@/types";
import Swal from "sweetalert2";

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct >= 1 ? "#ef4444" : pct >= 0.8 ? "#f59e0b" : "var(--color-text-secondary)";
  return (
    <span style={{ display: "block", textAlign: "right", fontSize: "0.65rem", color, marginTop: "0.25rem" }}>
      {current}/{max}
    </span>
  );
}

interface Props {
  userRut: string;
  userCargo: Cargo | string;
}

const FAQS = [
  {
    pregunta: "Como ingreso al sistema?",
    respuesta:
      "Solo los supervisores y administradores pueden ingresar. Usa tu RUT y contrasena asignada por el administrador.",
  },
  {
    pregunta: "Que significan los colores del semaforo?",
    respuesta:
      "Verde = todo normal, Amarillo = nivel de atencion (filtros y bateria), Rojo = alerta critica que requiere accion inmediata.",
  },
  {
    pregunta: "Como se generan las alertas?",
    respuesta:
      "Las alertas son generadas automaticamente por el modelo de IA del sensor instalado en la mascarilla.",
  },
  {
    pregunta: "Como restablecer mi contrasena?",
    respuesta:
      "En la pantalla de login, haz clic en 'Olvidaste tu contrasena?' e ingresa tu correo para recibir un enlace de recuperacion.",
  },
  {
    pregunta: "Puedo ver el historial de alertas de un trabajador especifico?",
    respuesta:
      "Si, en la seccion 'Historial de Alertas' puedes filtrar por trabajador, tipo de alerta y rango de fechas.",
  },
];

const ESTADO_BADGE: Record<EstadoTicket, string> = {
  ABIERTO: "badge-yellow",
  EN_PROGRESO: "badge-blue",
  CERRADO: "badge-green",
};

const ESTADO_LABEL: Record<EstadoTicket, string> = {
  ABIERTO: "Abierto",
  EN_PROGRESO: "En progreso",
  CERRADO: "Cerrado",
};

export default function AyudaClient({ userRut, userCargo }: Props) {
  const [abiertos, setAbiertos] = useState<number[]>([]);
  const [ticket, setTicket] = useState({ asunto: "", descripcion: "" });
  const [enviando, setEnviando] = useState(false);
  const [ticketTouched, setTicketTouched] = useState<Record<string, boolean>>({});

  function getTicketFieldError(field: string, value: string): string | null {
    if (!ticketTouched[field]) return null;
    switch (field) {
      case "asunto": return !value.trim() ? "Asunto es obligatorio" : null;
      case "descripcion": return !value.trim() ? "Descripcion es obligatoria" : null;
      default: return null;
    }
  }
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const isAdmin = userCargo === "Administrador";

  function toggleFaq(i: number) {
    setAbiertos((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function cargarTickets() {
    if (!userRut) return;
    setLoadingTickets(true);
    try {
      const data = await api.tickets.byTrabajador(userRut);
      setMisTickets(data);
    } catch (err) {
      console.error("Error cargando tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function cargarTodosTickets() {
    setLoadingTickets(true);
    try {
      const data = await api.tickets.list();
      setAllTickets(Array.isArray(data) ? data : (data as unknown as { content: Ticket[] }).content || []);
    } catch (err) {
      console.error("Error cargando todos los tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function cambiarEstadoTicket(ticketId: number, nuevoEstado: EstadoTicket) {
    try {
      await api.tickets.cambiarEstado(ticketId, nuevoEstado);
      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        text: `Ticket actualizado a ${ESTADO_LABEL[nuevoEstado]}`,
        background: "#1c2333",
        color: "#e6edf3",
        timer: 1500,
        showConfirmButton: false,
      });
      if (vistaAdmin) cargarTodosTickets();
      else cargarTickets();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    }
  }

  useEffect(() => {
    if (vistaAdmin && isAdmin) {
      cargarTodosTickets();
    } else {
      cargarTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRut, vistaAdmin]);

  async function enviarTicket(e: React.FormEvent) {
    e.preventDefault();
    // Mark all fields as touched on submit
    setTicketTouched({ asunto: true, descripcion: true });
    if (!ticket.asunto.trim() || !ticket.descripcion.trim()) return;
    setEnviando(true);
    try {
      await api.tickets.create({
        asunto: ticket.asunto,
        descripcion: ticket.descripcion,
        rutTrabajador: userRut,
      });
      setTicket({ asunto: "", descripcion: "" });
      setTicketTouched({});
      Swal.fire({
        icon: "success",
        title: "Ticket enviado",
        text: "El equipo de soporte lo atendera pronto",
        background: "#1c2333",
        color: "#e6edf3",
        timer: 2000,
        showConfirmButton: false,
      });
      cargarTickets();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as Error).message,
        background: "#1c2333",
        color: "#e6edf3",
      });
    } finally {
      setEnviando(false);
    }
  }

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Ayuda</h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
          }}
        >
          Preguntas frecuentes y soporte tecnico
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* FAQ */}
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>
            Preguntas frecuentes
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {FAQS.map((faq, i) => (
              <div key={i} className="card" style={{ padding: "0" }}>
                <button
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-primary)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textAlign: "left",
                  }}
                >
                  {faq.pregunta}
                  <span
                    style={{
                      fontSize: "0.75rem",
                      marginLeft: "0.5rem",
                      flexShrink: 0,
                      transition: "transform 0.15s",
                      transform: abiertos.includes(i)
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    &#9654;
                  </span>
                </button>
                {abiertos.includes(i) && (
                  <div
                    style={{
                      padding: "0 1rem 1rem",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {faq.respuesta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ticket form + My tickets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Create ticket */}
          <div>
            <h2
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                marginBottom: "1rem",
              }}
            >
              Crear ticket de soporte
            </h2>
            <div className="card">
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.8rem",
                  marginBottom: "1.25rem",
                }}
              >
                No encontraste lo que buscabas? Envianos tu consulta y te
                responderemos a la brevedad.
              </p>
              <form
                onSubmit={enviarTicket}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Asunto
                  </label>
                  <input
                    className="input-field"
                    placeholder="Describe brevemente tu problema"
                    value={ticket.asunto}
                    onChange={(e) =>
                      setTicket({ ...ticket, asunto: e.target.value })
                    }
                    onBlur={() => setTicketTouched(prev => ({ ...prev, asunto: true }))}
                    required
                    maxLength={200}
                    style={{ borderColor: getTicketFieldError("asunto", ticket.asunto) ? "#ef4444" : undefined }}
                  />
                  <CharCounter current={ticket.asunto.length} max={200} />
                  {getTicketFieldError("asunto", ticket.asunto) && (
                    <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                      {getTicketFieldError("asunto", ticket.asunto)}
                    </span>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Descripcion
                  </label>
                  <textarea
                    className="input-field"
                    rows={6}
                    placeholder="Explica con detalle tu problema o consulta..."
                    value={ticket.descripcion}
                    onChange={(e) =>
                      setTicket({ ...ticket, descripcion: e.target.value })
                    }
                    onBlur={() => setTicketTouched(prev => ({ ...prev, descripcion: true }))}
                    required
                    maxLength={500}
                    style={{ resize: "vertical", borderColor: getTicketFieldError("descripcion", ticket.descripcion) ? "#ef4444" : undefined }}
                  />
                  <CharCounter current={ticket.descripcion.length} max={500} />
                  {getTicketFieldError("descripcion", ticket.descripcion) && (
                    <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                      {getTicketFieldError("descripcion", ticket.descripcion)}
                    </span>
                  )}
                </div>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={enviando}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    width: "100%",
                  }}
                >
                  {enviando ? "Enviando..." : "Enviar ticket"}
                </button>
              </form>
            </div>
          </div>

          {/* My tickets / Admin tickets */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>
                {vistaAdmin ? "Todos los tickets" : "Mis tickets"}
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setVistaAdmin(!vistaAdmin)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--color-border)",
                    background: vistaAdmin ? "var(--color-accent)" : "transparent",
                    color: vistaAdmin ? "#fff" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {vistaAdmin ? "Ver mis tickets" : "Administrar tickets"}
                </button>
              )}
            </div>
            <div className="card">
              {loadingTickets && (
                <div style={{ padding: "0.75rem 0" }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", borderBottom: i < 3 ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: "0.375rem" }} />
                        <div className="skeleton" style={{ height: 10, width: "40%" }} />
                      </div>
                      <div className="skeleton" style={{ height: 22, width: 70 }} />
                    </div>
                  ))}
                </div>
              )}

              {!loadingTickets && (vistaAdmin ? allTickets : misTickets).length === 0 && (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    padding: "1.5rem 0",
                  }}
                >
                  {vistaAdmin ? "No hay tickets registrados" : "No tienes tickets registrados"}
                </p>
              )}

              {!loadingTickets && (vistaAdmin ? allTickets : misTickets).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {(vistaAdmin ? allTickets : misTickets).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.asunto}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-secondary)",
                            marginTop: "0.125rem",
                          }}
                        >
                          {vistaAdmin && t.trabajador
                            ? `${t.trabajador.nombre} ${t.trabajador.apellidoPaterno || ""} — `
                            : ""}
                          {formatFecha(t.creadoEn)}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                        {isAdmin && vistaAdmin && t.estado !== "CERRADO" ? (
                          <select
                            value={t.estado}
                            onChange={(e) => cambiarEstadoTicket(t.id, e.target.value as EstadoTicket)}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.375rem",
                              border: "1px solid var(--color-border)",
                              background: "var(--color-bg-secondary)",
                              color: "var(--color-text-primary)",
                              cursor: "pointer",
                            }}
                          >
                            <option value="ABIERTO">Abierto</option>
                            <option value="EN_PROGRESO">En progreso</option>
                            <option value="CERRADO">Cerrado</option>
                          </select>
                        ) : (
                          <span
                            className={ESTADO_BADGE[t.estado] || "badge-gray"}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {ESTADO_LABEL[t.estado] || t.estado}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
