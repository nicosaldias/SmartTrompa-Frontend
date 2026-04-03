"use client";

import { useState, useEffect } from "react";
import { api } from "@/api/client";
import type { Ticket, EstadoTicket } from "@/types";
import Swal from "sweetalert2";

interface Props {
  userRut: string;
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

export default function AyudaClient({ userRut }: Props) {
  const [abiertos, setAbiertos] = useState<number[]>([]);
  const [ticket, setTicket] = useState({ asunto: "", descripcion: "" });
  const [enviando, setEnviando] = useState(false);
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

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

  useEffect(() => {
    cargarTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRut]);

  async function enviarTicket(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.tickets.create({
        asunto: ticket.asunto,
        descripcion: ticket.descripcion,
        rutTrabajador: userRut,
      });
      setTicket({ asunto: "", descripcion: "" });
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
                    required
                  />
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
                    rows={5}
                    placeholder="Explica con detalle tu problema o consulta..."
                    value={ticket.descripcion}
                    onChange={(e) =>
                      setTicket({ ...ticket, descripcion: e.target.value })
                    }
                    required
                    style={{ resize: "vertical" }}
                  />
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
                  }}
                >
                  {enviando ? "Enviando..." : "Enviar ticket"}
                </button>
              </form>
            </div>
          </div>

          {/* My tickets */}
          <div>
            <h2
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                marginBottom: "1rem",
              }}
            >
              Mis tickets
            </h2>
            <div className="card">
              {loadingTickets && (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    padding: "1.5rem 0",
                  }}
                >
                  Cargando tickets...
                </p>
              )}

              {!loadingTickets && misTickets.length === 0 && (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    textAlign: "center",
                    padding: "1.5rem 0",
                  }}
                >
                  No tienes tickets registrados
                </p>
              )}

              {!loadingTickets && misTickets.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {misTickets.map((t) => (
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
                          {formatFecha(t.creadoEn)}
                        </p>
                      </div>
                      <span
                        className={ESTADO_BADGE[t.estado] || "badge-gray"}
                        style={{
                          fontSize: "0.7rem",
                          flexShrink: 0,
                          marginLeft: "0.75rem",
                        }}
                      >
                        {ESTADO_LABEL[t.estado] || t.estado}
                      </span>
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
