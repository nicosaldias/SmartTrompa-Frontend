"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from "react";
import api from "@/api/client";
import type { AuditLogEntry, PageResponse } from "@/types";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { abrirCalendario } from "@/utils/datePicker";
import { formatFechaHora } from "@/utils/fechas";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import EmptyState from "@/components/EmptyState";

interface Props {
  initialPage: PageResponse<AuditLogEntry>;
}

const PAGE_SIZE = 50;
const FILTER_DEBOUNCE_MS = 350;

interface FiltrosAuditoria {
  actor: string;
  accion: string;
  desde: string;
  hasta: string;
}

function buildParams(filtros: FiltrosAuditoria): Record<string, string> {
  const params: Record<string, string> = {};
  if (filtros.actor.trim()) params.actor = filtros.actor.trim();
  if (filtros.accion.trim()) params.accion = filtros.accion.trim();
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  return params;
}

function resultadoBadgeClass(resultado: AuditLogEntry["resultado"]): string {
  if (resultado === "ERROR") return "badge-yellow";
  if (resultado === "DENEGADO") return "badge-red";
  return "badge-green";
}

export default function AuditoriaClient({ initialPage }: Props) {
  const t = useT();
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialPage.content);
  const [totalElements, setTotalElements] = useState(initialPage.totalElements);
  const [totalPages, setTotalPages] = useState(initialPage.totalPages);
  const [currentPage, setCurrentPage] = useState(initialPage.number);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [actor, setActor] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Mismo patrón anti-out-of-order del Historial de Alertas.
  const fetchSeq = useRef(0);

  const runFetch = useCallback(async (page: number, filtros: FiltrosAuditoria) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const result = await api.auditLog.listPaged(page, PAGE_SIZE, buildParams(filtros));
      if (seq !== fetchSeq.current) return;
      setEntries(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      setCurrentPage(result.number);
      setExpandedId(null);
    } catch {
      // conserva los datos actuales ante error
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, []);

  const filtros = useMemo<FiltrosAuditoria>(
    () => ({ actor, accion, desde, hasta }),
    [actor, accion, desde, hasta]
  );
  const debouncedFiltros = useDebouncedValue(filtros, FILTER_DEBOUNCE_MS);
  const filtersSettling = filtros !== debouncedFiltros;

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    runFetch(0, debouncedFiltros);
  }, [debouncedFiltros, runFetch]);

  const hayFiltros = actor || accion || desde || hasta;

  return (
    <div>
      <div className="page-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{t("auditoria.title")}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
            {t("auditoria.subtitle")}
          </p>
        </div>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
          {t("auditoria.total", { total: String(totalElements) })}
        </span>
      </div>

      <div className="card" style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{t("auditoria.filterActor")}</label>
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder={t("auditoria.filterActorPlaceholder")}
            style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", width: 160 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{t("auditoria.filterAccion")}</label>
          <input
            type="text"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            placeholder={t("auditoria.filterAccionPlaceholder")}
            style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", width: 180 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{t("auditoria.filterDesde")}</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            onClick={abrirCalendario}
            style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{t("auditoria.filterHasta")}</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            onClick={abrirCalendario}
            style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}
          />
        </div>
        {hayFiltros && (
          <button
            onClick={() => { setActor(""); setAccion(""); setDesde(""); setHasta(""); }}
            style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.4rem 0.6rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "0.8rem" }}
          >
            <X size={14} /> {t("historialAlertas.clearFilters")}
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {entries.length === 0 ? (
          <EmptyState title={t("auditoria.empty")} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "0.6rem 0.75rem", width: 24 }} />
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colFecha")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colActor")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colCargo")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colAccion")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colEntidad")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colResultado")}</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>{t("auditoria.colOrigen")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: entry.detalle ? "pointer" : "default" }}
                    >
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-secondary)" }}>
                        {entry.detalle ? (expandedId === entry.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>{formatFechaHora(entry.timestamp)}</td>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>{entry.actorRut ?? "—"}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{entry.actorCargo ?? "—"}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.78rem" }}>{entry.accion}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {entry.entidad ?? "—"}
                        {entry.entidadId ? <span style={{ color: "var(--color-text-secondary)" }}> #{entry.entidadId}</span> : null}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span className={`badge ${resultadoBadgeClass(entry.resultado)}`}>{entry.resultado}</span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{entry.origen ?? "—"}</td>
                    </tr>
                    {expandedId === entry.id && entry.detalle && (
                      <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
                        <td colSpan={8} style={{ padding: "0.5rem 0.75rem" }}>
                          <code style={{ fontSize: "0.75rem", wordBreak: "break-all", color: "var(--color-text-secondary)" }}>
                            {entry.detalle}
                          </code>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            onClick={() => runFetch(currentPage - 1, filtros)}
            disabled={currentPage === 0 || loading || filtersSettling}
            className="btn-secondary"
            style={{ padding: "0.35rem 0.9rem" }}
          >
            «
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {t("historialAlertas.pageOf", { page: String(currentPage + 1), total: String(totalPages) })}
          </span>
          <button
            onClick={() => runFetch(currentPage + 1, filtros)}
            disabled={currentPage >= totalPages - 1 || loading || filtersSettling}
            className="btn-secondary"
            style={{ padding: "0.35rem 0.9rem" }}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
