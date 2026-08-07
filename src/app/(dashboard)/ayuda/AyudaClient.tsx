"use client";

import { useState, useEffect } from "react";
import { api } from "@/api/client";
import type { Ticket, EstadoTicket, Cargo } from "@/types";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import { esSuperAdmin } from "@/utils/roles";

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

const FAQ_KEYS = ["login", "trafficLight", "alerts", "resetPassword", "workerHistory", "menuTabs", "alertAction", "summaryInfo", "additionalHelp"] as const;

const ESTADO_BADGE: Record<EstadoTicket, string> = {
  ABIERTO: "badge-yellow",
  EN_PROGRESO: "badge-blue",
  CERRADO: "badge-green",
};

export default function AyudaClient({ userRut, userCargo }: Props) {
  const t = useT();
  const FAQS = FAQ_KEYS.map((k) => ({
    pregunta: t(`ayuda.faq.${k}.q`),
    respuesta: t(`ayuda.faq.${k}.a`),
  }));
  const ESTADO_LABEL: Record<EstadoTicket, string> = {
    ABIERTO: t("ayuda.status.open"),
    EN_PROGRESO: t("ayuda.status.inProgress"),
    CERRADO: t("ayuda.status.closed"),
  };
  const [abiertos, setAbiertos] = useState<number[]>([]);
  const [ticket, setTicket] = useState({ asunto: "", descripcion: "" });
  const [enviando, setEnviando] = useState(false);
  const [ticketTouched, setTicketTouched] = useState<Record<string, boolean>>({});

  function getTicketFieldError(field: string, value: string): string | null {
    if (!ticketTouched[field]) return null;
    switch (field) {
      case "asunto": return !value.trim() ? t("ayuda.subjectRequired") : null;
      case "descripcion": return !value.trim() ? t("ayuda.descriptionRequired") : null;
      default: return null;
    }
  }
  const [misTickets, setMisTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  // Q3 (multitenant): los tickets ahora los gestiona el SuperAdministrador global,
  // no el Administrador de cada empresa. El backend (F2) solo permite listar todos /
  // cambiar estado / eliminar a SuperAdministrador; un Administrador queda como
  // cualquier usuario: crea tickets y ve solo los suyos.
  const isSuperAdmin = esSuperAdmin(userCargo);

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
        title: t("ayuda.statusUpdatedTitle"),
        text: t("ayuda.ticketUpdatedTo", { status: ESTADO_LABEL[nuevoEstado] }),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        timer: 1500,
        showConfirmButton: false,
      });
      if (vistaAdmin) cargarTodosTickets();
      else cargarTickets();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  useEffect(() => {
    // Q3: solo el SuperAdministrador puede pedir el listado global (GET /api/ticket/).
    if (vistaAdmin && isSuperAdmin) {
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
        title: t("ayuda.ticketSentTitle"),
        text: t("ayuda.ticketSentText"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        timer: 2000,
        showConfirmButton: false,
      });
      cargarTickets();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
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
      <div className="ayuda-header" style={{ marginBottom: "2rem" }}>
        <h1 className="ayuda-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("ayuda.title")}</h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
          }}
        >
          {t("ayuda.subtitle")}
        </p>
      </div>

      <div
        className="ayuda-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* FAQ */}
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>
            {t("ayuda.faqTitle")}
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
              {t("ayuda.createTicketTitle")}
            </h2>
            <div className="card">
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.8rem",
                  marginBottom: "1.25rem",
                }}
              >
                {t("ayuda.createTicketHelp")}
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
                    {t("ayuda.subject")}
                  </label>
                  <input
                    className="input-field"
                    placeholder={t("ayuda.subjectPlaceholder")}
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
                    {t("ayuda.description")}
                  </label>
                  <textarea
                    className="input-field"
                    rows={6}
                    placeholder={t("ayuda.descriptionPlaceholder")}
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
                  {enviando ? t("ayuda.sending") : t("ayuda.sendTicket")}
                </button>
              </form>
            </div>
          </div>

          {/* My tickets / Admin tickets */}
          <div>
            <div className="ayuda-tickets-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>
                {vistaAdmin ? t("ayuda.allTickets") : t("ayuda.myTickets")}
              </h2>
              {/* Q3: el toggle de gestión queda oculto para Administrador (solo SuperAdmin). */}
              {isSuperAdmin && (
                <button
                  onClick={() => setVistaAdmin(!vistaAdmin)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--color-border)",
                    background: vistaAdmin ? "var(--color-accent)" : "transparent",
                    // Botón activo = relleno #f97316 en los dos temas, así que el par
                    // texto/fondo no depende del tema: con #fff quedaba en 2.80:1 y con
                    // --color-on-accent en 5.91:1.
                    color: vistaAdmin ? "var(--color-on-accent)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {vistaAdmin ? t("ayuda.viewMyTickets") : t("ayuda.manageTickets")}
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
                  {vistaAdmin ? t("ayuda.noTicketsRegistered") : t("ayuda.noTicketsOfMine")}
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
                  {(vistaAdmin ? allTickets : misTickets).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="ayuda-ticket-row"
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
                          {ticket.asunto}
                        </p>
                        <p
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.375rem",
                            fontSize: "0.75rem",
                            color: "var(--color-text-secondary)",
                            marginTop: "0.125rem",
                          }}
                        >
                          {/* Solo en la vista global del SuperAdministrador: de qué
                              empresa viene el ticket (via trabajador.empresa). */}
                          {isSuperAdmin && vistaAdmin && (
                            <span
                              className="badge-gray"
                              style={{ fontSize: "0.65rem", flexShrink: 0 }}
                              title={t("ayuda.empresaLabel")}
                            >
                              {ticket.trabajador?.empresa?.nombre ?? t("ayuda.sinEmpresa")}
                            </span>
                          )}
                          <span>
                            {vistaAdmin && ticket.trabajador
                              ? `${ticket.trabajador.nombre} ${ticket.trabajador.apellidoPaterno || ""} — `
                              : ""}
                            {formatFecha(ticket.creadoEn)}
                          </span>
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                        {/* Q3: cambiar estado es acción exclusiva del SuperAdministrador. */}
                        {isSuperAdmin && vistaAdmin && ticket.estado !== "CERRADO" ? (
                          <select
                            value={ticket.estado}
                            onChange={(e) => cambiarEstadoTicket(ticket.id, e.target.value as EstadoTicket)}
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
                            <option value="ABIERTO">{t("ayuda.status.open")}</option>
                            <option value="EN_PROGRESO">{t("ayuda.status.inProgress")}</option>
                            <option value="CERRADO">{t("ayuda.status.closed")}</option>
                          </select>
                        ) : (
                          <span
                            className={ESTADO_BADGE[ticket.estado] || "badge-gray"}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {ESTADO_LABEL[ticket.estado] || ticket.estado}
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

      <style>{`
        @media (max-width: 1024px) {
          .ayuda-main-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
        @media (max-width: 768px) {
          .ayuda-header {
            margin-bottom: 1.25rem !important;
          }
          .ayuda-title {
            font-size: 1.25rem !important;
          }
          .ayuda-main-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .ayuda-tickets-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
          }
          .ayuda-ticket-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }
          .ayuda-ticket-row > div:last-child {
            margin-left: 0 !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}
