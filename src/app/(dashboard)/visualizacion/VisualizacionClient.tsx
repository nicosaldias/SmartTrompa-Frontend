"use client";

import { useState } from "react";
import { api } from "@/api/client";
import type { Trabajador, JornadaTrabajo } from "@/types";

interface Props {
  supervisores: Trabajador[];
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisualizacionClient({ supervisores }: Props) {
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [jornadas, setJornadas] = useState<JornadaTrabajo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function buscar() {
    if (!selectedSupervisor) return;
    setLoading(true);
    setSearched(true);
    try {
      const params: { inicio?: string; fin?: string } = {};
      if (fechaDesde) params.inicio = fechaDesde;
      if (fechaHasta) params.fin = fechaHasta;
      const data = await api.jornadas.bySupervisor(
        selectedSupervisor,
        Object.keys(params).length > 0 ? params : undefined
      );
      setJornadas(data);
    } catch (err) {
      console.error("Error buscando jornadas:", err);
      setJornadas([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          Visualizacion de Cuadrilla
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
          }}
        >
          Consulta el historial de jornadas por supervisor y rango de fechas
        </p>
      </div>

      {/* Filtros */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 240px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              marginBottom: "0.375rem",
              fontWeight: 600,
            }}
          >
            Supervisor
          </label>
          <select
            className="input-field"
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
          >
            <option value="">Seleccionar supervisor...</option>
            {supervisores.map((s) => (
              <option key={s.rut} value={s.rut}>
                {s.nombre} {s.apellidoPaterno} — {s.rut}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              marginBottom: "0.375rem",
              fontWeight: 600,
            }}
          >
            Desde
          </label>
          <input
            className="input-field"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              marginBottom: "0.375rem",
              fontWeight: 600,
            }}
          >
            Hasta
          </label>
          <input
            className="input-field"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <button
            className="btn-primary"
            onClick={buscar}
            disabled={!selectedSupervisor || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {searched && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Historial de Jornadas
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              Total: {jornadas.length} registro{jornadas.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading && (
            <p style={{ color: "var(--color-text-secondary)", padding: "2rem 0" }}>
              Cargando jornadas...
            </p>
          )}

          {!loading && jornadas.length === 0 && (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "3rem 2rem",
                color: "var(--color-text-secondary)",
              }}
            >
              <p style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                &#128203;
              </p>
              <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                Sin resultados
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                No se encontraron jornadas para los filtros seleccionados
              </p>
            </div>
          )}

          {!loading && jornadas.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
                gap: "1rem",
              }}
            >
              {jornadas.map((j) => (
                <div
                  key={j.id}
                  className="card"
                  style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                >
                  {/* Top row: badge + ID */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={j.terminada ? "badge-gray" : "badge-green"}>
                      {j.terminada ? "COMPLETADA" : "EN CURSO"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      ID: {j.id}
                    </span>
                  </div>

                  {/* Fecha */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "var(--color-text-secondary)",
                          fontWeight: 600,
                          marginBottom: "0.125rem",
                        }}
                      >
                        FECHA
                      </span>
                      <span>{formatFecha(j.inicio)}</span>
                    </div>
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "var(--color-text-secondary)",
                          fontWeight: 600,
                          marginBottom: "0.125rem",
                        }}
                      >
                        UBICACION
                      </span>
                      <span>{j.ubicacion?.nombre || "Sin asignar"}</span>
                    </div>
                  </div>

                  {/* IN/OUT */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "var(--color-text-secondary)",
                          fontWeight: 600,
                          marginBottom: "0.125rem",
                        }}
                      >
                        ENTRADA
                      </span>
                      <span>{formatHora(j.inicio)}</span>
                    </div>
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "var(--color-text-secondary)",
                          fontWeight: 600,
                          marginBottom: "0.125rem",
                        }}
                      >
                        SALIDA
                      </span>
                      <span>{j.fin ? formatHora(j.fin) : "—"}</span>
                    </div>
                  </div>

                  {/* Trabajador */}
                  <div style={{ fontSize: "0.85rem" }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.7rem",
                        color: "var(--color-text-secondary)",
                        fontWeight: 600,
                        marginBottom: "0.125rem",
                      }}
                    >
                      TRABAJADOR
                    </span>
                    <span>{j.rutUsuario}</span>
                  </div>

                  {/* Equipment tags */}
                  {(j.tipoFiltro || j.tipoRespirador) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {j.tipoFiltro && (
                        <span
                          className="badge-yellow"
                          style={{ fontSize: "0.7rem" }}
                        >
                          Filtro: {j.tipoFiltro.nombre}
                        </span>
                      )}
                      {j.tipoRespirador && (
                        <span
                          className="badge-yellow"
                          style={{ fontSize: "0.7rem" }}
                        >
                          Respirador: {j.tipoRespirador.nombre}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: "0.75rem",
                      marginTop: "auto",
                    }}
                  >
                    {j.terminada ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--color-text-secondary)",
                          cursor: "default",
                        }}
                      >
                        REPORTE FINAL
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--color-accent)",
                          cursor: "pointer",
                        }}
                      >
                        VER DETALLES
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Initial state before search */}
      {!searched && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <p style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            &#128269;
          </p>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            Selecciona un supervisor
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Elige un supervisor y opcionalmente un rango de fechas para ver el
            historial de jornadas
          </p>
        </div>
      )}
    </div>
  );
}
