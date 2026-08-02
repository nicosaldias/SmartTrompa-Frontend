"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/api/client";
import Swal from "sweetalert2";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, User, Activity, Loader2 } from "lucide-react";
import type { AlertaHistorial, TipoAlerta, NivelAlerta } from "@/types";
import { BINARY_ALERT_TYPES } from "@/types";
import { fmtNum } from "@/utils/format";
import { VALOR_UNIDAD } from "@/utils/sensorMappings";
import { formatFechaHora } from "@/utils/fechas";
import { tipoColor } from "@/utils/alertaTokens";

interface Props {
  alertaId: number;
}

function tipoBadgeColor(tipo: TipoAlerta): string {
  return tipoColor(tipo);
}

function nivelBadgeStyle(nivel: NivelAlerta): { bg: string; text: string } {
  switch (nivel) {
    case "CRITICO": return { bg: "rgba(239,68,68,0.15)", text: "#ef4444" };
    case "ALERTA": return { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" };
    case "OK": return { bg: "rgba(34,197,94,0.15)", text: "#22c55e" };
    default: return { bg: "rgba(107,114,128,0.15)", text: "#6b7280" };
  }
}

function nivelLabel(nivel: NivelAlerta, tipo: TipoAlerta): string {
  if (BINARY_ALERT_TYPES.includes(tipo)) {
    return nivel === "OK" ? "NORMAL" : "CRÍTICO";
  }
  return nivel === "CRITICO" ? "CRÍTICO" : nivel;
}

export default function AlertaDetalleClient({ alertaId }: Props) {
  const router = useRouter();
  const [alerta, setAlerta] = useState<AlertaHistorial | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerta = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const detalleResp = await api.alertas.detalle(alertaId);
        setAlerta(detalleResp.alerta);
      } catch {
        const alertaData = await api.alertas.list({ id: String(alertaId) });
        if (alertaData && alertaData.length > 0) {
          setAlerta(alertaData[0]);
        }
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar la alerta",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    } finally {
      setLoading(false);
    }
  }, [alertaId]);

  useEffect(() => {
    fetchAlerta();
  }, [fetchAlerta]);

  const handleResolver = useCallback(async () => {
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: "Resolver alerta",
      html: `
        <label style="display:block;text-align:left;font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:0.25rem;">Resolución / Observación</label>
        <textarea id="swal-resolucion" class="swal2-textarea" placeholder="Describe la resolución" style="margin:0 0 0.75rem 0;width:100%;min-height:80px;"></textarea>
        <label style="display:block;text-align:left;font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:0.25rem;">Medidas tomadas</label>
        <textarea id="swal-medidas" class="swal2-textarea" placeholder="Qué medidas se tomaron" style="margin:0;width:100%;min-height:80px;"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Resolver alerta",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#6b7280",
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      preConfirm: () => {
        const resolucion = (document.getElementById("swal-resolucion") as HTMLTextAreaElement)?.value.trim() ?? "";
        const medidasTomadas = (document.getElementById("swal-medidas") as HTMLTextAreaElement)?.value.trim() ?? "";
        if (!resolucion) {
          Swal.showValidationMessage("Ingresa la resolución de la alerta");
          return false;
        }
        return { resolucion, medidasTomadas };
      },
    });

    if (!isConfirmed || !formValues) return;

    try {
      await api.alertas.resolver(alertaId, {
        resolucion: formValues.resolucion,
        medidasTomadas: formValues.medidasTomadas || undefined,
      });
      await fetchAlerta();
      await Swal.fire({
        icon: "success",
        title: "Alerta resuelta",
        text: "La alerta se marcó como resuelta correctamente",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        confirmButtonColor: "#22c55e",
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo resolver la alerta. Intenta nuevamente.",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        confirmButtonColor: "#ef4444",
      });
    }
  }, [alertaId, fetchAlerta]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-accent)" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!alerta) {
    return (
      <div>
        <button
          className="btn-secondary"
          onClick={() => router.push("/historial-alertas")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}
        >
          <ArrowLeft size={16} />
          Volver al historial
        </button>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <AlertTriangle size={48} style={{ color: "var(--color-text-secondary)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem" }}>
            No se encontró la alerta solicitada
          </p>
        </div>
      </div>
    );
  }

  const trabajadorNombre = alerta.trabajador
    ? `${alerta.trabajador.nombre} ${alerta.trabajador.apellidoPaterno} ${alerta.trabajador.apellidoMaterno}`
    : alerta.rutTrabajador;

  const tipoColor = tipoBadgeColor(alerta.tipo);
  const nivelStyle = nivelBadgeStyle(alerta.nivel);

  return (
    <div className="alerta-detalle-root">
      {/* Back button */}
      <button
        className="btn-secondary"
        onClick={() => router.push("/historial-alertas")}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}
      >
        <ArrowLeft size={16} />
        Volver al historial
      </button>

      {/* Header */}
      <div
        style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
        className="alerta-detalle-header"
      >
        <div>
          <h1 className="alerta-detalle-title" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            Detalle de Alerta #{alerta.id}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Información de la alerta
          </p>
        </div>
        {alerta.activa && (
          <button
            onClick={handleResolver}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(34,197,94,0.4)",
              backgroundColor: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <CheckCircle size={16} />
            Resolver alerta
          </button>
        )}
      </div>

      {/* Alert info card */}
      <div className="card alerta-detalle-card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {/* Tipo badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: `${tipoColor}22`,
              color: tipoColor,
              border: `1px solid ${tipoColor}44`,
            }}
          >
            <Activity size={12} />
            {alerta.tipo}
          </span>

          {/* Nivel badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: nivelStyle.bg,
              color: nivelStyle.text,
              border: `1px solid ${nivelStyle.text}44`,
            }}
          >
            <AlertTriangle size={12} />
            {nivelLabel(alerta.nivel, alerta.tipo)}
          </span>

          {/* Status badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: alerta.activa ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
              color: alerta.activa ? "#f59e0b" : "#22c55e",
              border: `1px solid ${alerta.activa ? "#f59e0b" : "#22c55e"}44`,
            }}
          >
            {alerta.activa ? <Clock size={12} /> : <CheckCircle size={12} />}
            {alerta.activa ? "Activa" : "Resuelta"}
          </span>
        </div>

        {/* Info grid */}
        <div
          className="alerta-detalle-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Trabajador */}
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
              Trabajador
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                  {trabajadorNombre}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                  {alerta.rutTrabajador}
                </p>
              </div>
            </div>
          </div>

          {/* Fecha y hora */}
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
              Fecha y hora
            </p>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
              {formatFechaHora(alerta.timestamp)}
            </p>
          </div>

          {/* Valor medido */}
          {alerta.valorMedido != null && VALOR_UNIDAD[alerta.tipo] && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                Valor medido
              </p>
              <p style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
                {fmtNum(alerta.valorMedido)} {VALOR_UNIDAD[alerta.tipo]}
              </p>
            </div>
          )}

          {/* Fecha resolucion o No resuelta */}
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
              Resolución
            </p>
            {alerta.activa ? (
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f59e0b" }}>
                No resuelta
              </p>
            ) : alerta.resueltaEn ? (
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#22c55e" }}>
                {formatFechaHora(alerta.resueltaEn)}
              </p>
            ) : (
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#22c55e" }}>
                Resuelta
              </p>
            )}
          </div>
        </div>

        {/* Descripcion */}
        {alerta.descripcion && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
              Descripción
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}>
              {alerta.descripcion}
            </p>
          </div>
        )}

        {/* Resolution info (if resolved) */}
        {!alerta.activa && (alerta.resolucion || alerta.medidasTomadas || alerta.resueltaPor) && (
          <div
            style={{
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle size={16} />
              Información de resolución
            </h3>
            {alerta.resueltaPor && (
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                  Resuelta por
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                  {alerta.resueltaPor}
                </p>
              </div>
            )}
            {alerta.resolucion && (
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                  Observación / Resolución
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}>
                  {alerta.resolucion}
                </p>
              </div>
            )}
            {alerta.medidasTomadas && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                  Medidas tomadas
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}>
                  {alerta.medidasTomadas}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .alerta-detalle-title { font-size: 1.15rem !important; }
          .alerta-detalle-card { padding: 0.85rem !important; }
          .alerta-detalle-grid { grid-template-columns: 1fr !important; gap: 0.85rem !important; }
        }
      `}</style>
    </div>
  );
}
