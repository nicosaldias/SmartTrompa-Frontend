"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/api/client";
import type {
  AlertaHistorial,
  AlertasUmbrales,
  FilterStatus,
  JornadaTrabajo,
} from "@/types";
import { Wind, Bell, Clock } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { formatFechaHora } from "@/utils/fechas";
import EmptyState from "@/components/EmptyState";

const POLL_MS = 30_000;
const MAX_FILAS = 20;

interface Props {
  rut: string;
  initialJornadas: JornadaTrabajo[];
  initialAlertas: AlertaHistorial[];
  initialFiltro: FilterStatus | null;
  initialUmbrales: AlertasUmbrales | null;
}

function nivelFiltroBadge(nivel: FilterStatus["nivelAlerta"]): string {
  if (nivel === "OK") return "badge-green";
  if (nivel === "ADVERTENCIA") return "badge-yellow";
  return "badge-red";
}

function nivelAlertaBadge(nivel: AlertaHistorial["nivel"]): string {
  if (nivel === "CRITICO") return "badge-red";
  if (nivel === "ALERTA") return "badge-yellow";
  return "badge-green";
}

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  textAlign: "left",
  color: "var(--color-text-secondary)",
  fontSize: "0.75rem",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = { padding: "0.5rem 0.75rem" };

export default function MiHistorialClient({
  rut,
  initialJornadas,
  initialAlertas,
  initialFiltro,
  initialUmbrales,
}: Props) {
  const t = useT();
  const [jornadas, setJornadas] = useState(initialJornadas);
  const [alertas, setAlertas] = useState(initialAlertas);
  const [filtro, setFiltro] = useState(initialFiltro);
  const [umbrales, setUmbrales] = useState(initialUmbrales);

  const refetch = useCallback(async () => {
    const [j, a, f, u] = await Promise.all([
      api.jornadas.byUsuario(rut).catch(() => null),
      api.alertas.byTrabajador(rut).catch(() => null),
      api.filterLifecycle.estadoByRut(rut).catch(() => null),
      api.umbrales.lastByTrabajador(rut).catch(() => null),
    ]);
    if (j) setJornadas(j);
    if (a) setAlertas(a);
    setFiltro(f);
    if (u) setUmbrales(u);
  }, [rut]);

  // El Trabajador no tiene canal STOMP (los /topic/** son de supervisión):
  // esta vista vive del polling, igual que el fallback del resto del dashboard.
  useEffect(() => {
    const timer = setInterval(refetch, POLL_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  const alertasOrdenadas = [...alertas].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const jornadasOrdenadas = [...jornadas].sort(
    (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime()
  );
  const alertasActivas = alertas.filter((a) => a.activa).length;
  const ultimaJornada = jornadasOrdenadas[0];

  const statCard: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{t("miHistorial.title")}</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
          {t("miHistorial.subtitle")}
        </p>
      </div>

      {/* Strip de estado personal */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        {/* Los tres íconos de este strip (Wind/Bell/Clock) son el único indicador visual
            de cada tarjeta: sobre .card blanco el acento puro daba 2.80:1, bajo el 3:1
            que WCAG 2.1 AA exige a componentes gráficos. Con -text quedan en 5.18:1. */}
        <div className="card" style={statCard}>
          <Wind size={20} style={{ color: "var(--color-accent-text)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              {t("miHistorial.filtroTitle")}
            </p>
            {filtro ? (
              <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                <span className={`badge ${nivelFiltroBadge(filtro.nivelAlerta)}`}>
                  {filtro.nivelAlerta}
                </span>{" "}
                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                  {t("miHistorial.filtroHoras", {
                    usadas: String(Math.round(filtro.horasUsadas)),
                    vida: String(Math.round(filtro.horasMaximas)),
                  })}
                </span>
              </p>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {t("miHistorial.filtroSinDatos")}
              </p>
            )}
          </div>
        </div>

        <div className="card" style={statCard}>
          <Bell size={20} style={{ color: "var(--color-accent-text)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              {t("miHistorial.alertasActivasTitle")}
            </p>
            <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{alertasActivas}</p>
          </div>
        </div>

        <div className="card" style={statCard}>
          <Clock size={20} style={{ color: "var(--color-accent-text)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              {t("miHistorial.ultimaJornadaTitle")}
            </p>
            {ultimaJornada ? (
              <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {formatFechaHora(ultimaJornada.inicio)}{" "}
                <span
                  className={`badge ${ultimaJornada.terminada ? "badge-green" : "badge-yellow"}`}
                >
                  {ultimaJornada.terminada ? t("miHistorial.terminada") : t("miHistorial.enCurso")}
                </span>
              </p>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {t("miHistorial.sinJornadaAun")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mis alertas */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1rem" }}>
        <div style={{ padding: "0.9rem 1rem 0.4rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{t("miHistorial.alertasTitle")}</h2>
          {alertasOrdenadas.length > MAX_FILAS && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              {t("miHistorial.mostrandoUltimas", { n: String(MAX_FILAS) })}
            </p>
          )}
        </div>
        {alertasOrdenadas.length === 0 ? (
          <EmptyState title={t("miHistorial.sinAlertas")} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th style={thStyle}>{t("miHistorial.colFecha")}</th>
                  <th style={thStyle}>{t("miHistorial.colTipo")}</th>
                  <th style={thStyle}>{t("miHistorial.colNivel")}</th>
                  <th style={thStyle}>{t("miHistorial.colEstado")}</th>
                </tr>
              </thead>
              <tbody>
                {alertasOrdenadas.slice(0, MAX_FILAS).map((alerta) => (
                  <tr key={alerta.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {formatFechaHora(alerta.timestamp)}
                    </td>
                    <td style={tdStyle}>{alerta.tipo}</td>
                    <td style={tdStyle}>
                      <span className={`badge ${nivelAlertaBadge(alerta.nivel)}`}>{alerta.nivel}</span>
                    </td>
                    <td style={tdStyle}>
                      <span className={`badge ${alerta.activa ? "badge-red" : "badge-green"}`}>
                        {alerta.activa ? t("miHistorial.activa") : t("miHistorial.resuelta")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mis jornadas */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1rem" }}>
        <div style={{ padding: "0.9rem 1rem 0.4rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{t("miHistorial.jornadasTitle")}</h2>
          {jornadasOrdenadas.length > MAX_FILAS && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              {t("miHistorial.mostrandoUltimas", { n: String(MAX_FILAS) })}
            </p>
          )}
        </div>
        {jornadasOrdenadas.length === 0 ? (
          <EmptyState title={t("miHistorial.sinJornadas")} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th style={thStyle}>{t("miHistorial.colInicio")}</th>
                  <th style={thStyle}>{t("miHistorial.colFin")}</th>
                  <th style={thStyle}>{t("miHistorial.colDispositivo")}</th>
                  <th style={thStyle}>{t("miHistorial.colEstado")}</th>
                </tr>
              </thead>
              <tbody>
                {jornadasOrdenadas.slice(0, MAX_FILAS).map((jornada) => (
                  <tr key={jornada.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {formatFechaHora(jornada.inicio)}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {jornada.fin ? formatFechaHora(jornada.fin) : "—"}
                    </td>
                    <td style={tdStyle}>{jornada.dispositivo ?? "—"}</td>
                    <td style={tdStyle}>
                      <span
                        className={`badge ${jornada.terminada ? "badge-green" : "badge-yellow"}`}
                      >
                        {jornada.terminada ? t("miHistorial.terminada") : t("miHistorial.enCurso")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mis umbrales vigentes */}
      <div className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {t("miHistorial.umbralesTitle")}
        </h2>
        {umbrales ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.5rem",
              fontSize: "0.83rem",
            }}
          >
            <p>
              <span style={{ color: "var(--color-text-secondary)" }}>{t("umbrales.fields.respAlto")}: </span>
              {umbrales.alrtRespAlto ?? "—"}
            </p>
            <p>
              <span style={{ color: "var(--color-text-secondary)" }}>{t("umbrales.fields.respBajo")}: </span>
              {umbrales.alrtRespBajo ?? "—"}
            </p>
            <p>
              <span style={{ color: "var(--color-text-secondary)" }}>{t("umbrales.fields.ajuste")}: </span>
              {umbrales.alrtAjus ?? "—"}
            </p>
            <p>
              <span style={{ color: "var(--color-text-secondary)" }}>{t("umbrales.fields.bateBajo")}: </span>
              {umbrales.alrtBateBajo ?? "—"}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
            {t("miHistorial.sinUmbrales")}
          </p>
        )}
      </div>
    </div>
  );
}
