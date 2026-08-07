"use client";

/**
 * Selector de empresa activa del SuperAdministrador (cookie st_empresa).
 * Solo se monta desde el Header cuando el usuario es SuperAdministrador:
 * el endpoint /api/empresa/ responde 403 para cualquier otro cargo, así que
 * aquí no hay gating propio — el gating vive en quien lo renderiza.
 */

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "@/api/client";
import type { Empresa } from "@/types";
import { getEmpresaActivaFromCookie } from "@/utils/cookies";
import { setEmpresaActivaAction } from "@/actions/auth";
import { useT } from "@/i18n/LanguageProvider";

/** Valor del option "Todas las empresas": scope global (sin cookie st_empresa). */
const SCOPE_GLOBAL = "";

export default function EmpresaSelector() {
  const t = useT();
  // null = aún cargando; [] = cargó pero no hay empresas registradas.
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [seleccion, setSeleccion] = useState<string>(SCOPE_GLOBAL);
  const [activaNombre, setActivaNombre] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    // Las cookies se leen en useEffect (no en el initializer del estado)
    // porque `document` no existe durante el prerender SSR del componente.
    const activa = getEmpresaActivaFromCookie();
    if (activa) {
      setSeleccion(String(activa.id));
      setActivaNombre(activa.nombre);
    }
    api.empresas
      .list()
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
  }, []);

  // Solo las habilitadas son elegibles: activar una empresa deshabilitada
  // dejaría al superadmin operando un tenant cuyos usuarios no pueden entrar.
  const habilitadas = (empresas ?? []).filter((e) => e.habilitada);

  const onChange = async (valor: string) => {
    const anterior = seleccion;
    // Optimista: el select controlado debe reflejar la elección mientras la
    // server action persiste la cookie; si falla, se revierte más abajo.
    setSeleccion(valor);
    setCambiando(true);
    try {
      if (valor === SCOPE_GLOBAL) {
        // "Todas las empresas" = borrar st_empresa → el superadmin vuelve
        // al scope global y el backend deja de recibir X-Empresa-Id útil.
        await setEmpresaActivaAction(null);
      } else {
        const empresa = habilitadas.find((e) => String(e.id) === valor);
        if (!empresa) throw new Error("empresa no encontrada en el listado");
        await setEmpresaActivaAction({ id: empresa.id, nombre: empresa.nombre });
      }
      // Recarga completa a propósito: los Server Components fetchean en el
      // servidor con la cookie nueva (que alimenta el header X-Empresa-Id) y
      // el WebSocket debe reabrirse con el scope nuevo. router.refresh() no
      // reinicia el socket ni el estado de los client components ya montados,
      // así que recargar la página es lo único robusto aquí.
      window.location.reload();
    } catch {
      // La action falló: revertir la selección y dejar reintentar.
      setSeleccion(anterior);
      setCambiando(false);
    }
  };

  const cargando = empresas === null;
  const scopeEmpresa = seleccion !== SCOPE_GLOBAL;
  // La empresa activa quedó deshabilitada o ya no existe: se muestra marcada
  // como no disponible (no elegible) y se deja volver a "Todas las empresas".
  const activaNoDisponible =
    !cargando && scopeEmpresa && !habilitadas.some((e) => String(e.id) === seleccion);
  const sinEmpresas = !cargando && habilitadas.length === 0 && !activaNoDisponible;
  const deshabilitado = cargando || cambiando || sinEmpresas;

  return (
    <span
      title={t("header.empresaSelector.label")}
      style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: 0 }}
    >
      <Building2
        size={16}
        style={{
          // Acento naranja cuando hay empresa activa: señal visual de que el
          // superadmin está operando DENTRO de una empresa, no en global.
          color: scopeEmpresa ? "var(--color-accent)" : "var(--color-text-secondary)",
          flexShrink: 0,
        }}
      />
      <select
        value={seleccion}
        onChange={(e) => onChange(e.target.value)}
        disabled={deshabilitado}
        aria-label={t("header.empresaSelector.label")}
        style={{
          maxWidth: 170,
          padding: "0.25rem 0.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          border: scopeEmpresa
            ? "1px solid var(--color-accent)"
            : "1px solid var(--color-border)",
          cursor: deshabilitado ? "not-allowed" : "pointer",
          textOverflow: "ellipsis",
        }}
      >
        {cargando ? (
          <option value={seleccion}>{t("header.empresaSelector.cargando")}</option>
        ) : sinEmpresas ? (
          <option value={SCOPE_GLOBAL}>{t("header.empresaSelector.sinEmpresas")}</option>
        ) : (
          <>
            <option value={SCOPE_GLOBAL}>{t("header.empresaSelector.global")}</option>
            {/* La activa quedó fuera de las habilitadas: se conserva como opción
                (el select no puede apuntar a un valor inexistente) pero marcada
                como no disponible y disabled, para que solo se pueda salir de
                ella hacia el scope global u otra empresa habilitada. */}
            {activaNoDisponible && (
              <option value={seleccion} disabled>
                {t("header.empresaSelector.noDisponible", {
                  nombre: activaNombre ?? seleccion,
                })}
              </option>
            )}
            {habilitadas.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.nombre}
              </option>
            ))}
          </>
        )}
      </select>
    </span>
  );
}
