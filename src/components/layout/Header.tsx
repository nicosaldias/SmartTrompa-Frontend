"use client";

import { Bell, LogOut, User, AlertTriangle, Clock } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "@/api/client";
import { API_BASE_URL } from "@/api/endpoints";
import type { FilterStatus, AlertaHistorial } from "@/types";
import { getUserFromCookie } from "@/utils/cookies";
import { logoutAction } from "@/actions/auth";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/types";
import { useRealtime, useRealtimeStatus } from "@/realtime/RealtimeProvider";

const ROLE_KEYS: Record<string, TranslationKey> = {
  Administrador: "roles.administrator",
  Supervisor: "roles.supervisor",
  Trabajador: "roles.worker",
};

// Marca configurable (white-label). Sobrescribible en build con:
//   NEXT_PUBLIC_BRAND_NAME — nombre de la empresa/institucion
//   NEXT_PUBLIC_BRAND_LOGO — ruta del logo (archivo en public/, ej: /brand-logo.png)
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Compañía Minera Universidad de Concepción";
const BRAND_LOGO = process.env.NEXT_PUBLIC_BRAND_LOGO || "/brand-logo.png";

export default function Header() {
  const t = useT();
  const [user, setUser] = useState<{ nombre?: string; cargo?: string; rut?: string } | null>(null);
  const [filtrosEnRiesgo, setFiltrosEnRiesgo] = useState<number>(0);
  const [alertasActivas, setAlertasActivas] = useState<number>(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [filtros, alertas] = await Promise.all([
        api.filterLifecycle.proximosVencer().catch(() => [] as FilterStatus[]),
        api.alertas.activas().catch(() => [] as AlertaHistorial[]),
      ]);
      setFiltrosEnRiesgo(filtros.length);
      setAlertasActivas(alertas.length);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setUser(getUserFromCookie());
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // En vivo: el badge de la campana reacciona al instante a cada alerta.
  useRealtime("alertas", fetchData);
  const realtimeStatus = useRealtimeStatus();

  // Session expiry warning timer
  useEffect(() => {
    const warningTimer = setTimeout(() => setSessionWarning(true), 13 * 60 * 1000);
    const hideTimer = setTimeout(() => setSessionWarning(false), 16 * 60 * 1000);
    return () => { clearTimeout(warningTimer); clearTimeout(hideTimer); };
  }, []);

  // Cerrar menu al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U";
  const [avatarError, setAvatarError] = useState(false);
  const avatarSrc = user?.rut ? `${API_BASE_URL}/trabajador/${user.rut}/imagen/?t=${Date.now()}` : null;

  return (
    <div>
      {sessionWarning && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.375rem 0.75rem", marginBottom: "0.5rem",
          borderRadius: "0.375rem", fontSize: "0.75rem",
          backgroundColor: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.25)",
          color: "#3b82f6",
        }}>
          <Clock size={14} />
          {t("header.sessionRenewing")}
        </div>
      )}
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 0",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
        {BRAND_LOGO && !logoError && (
          <img
            src={BRAND_LOGO}
            alt={BRAND_NAME}
            style={{ height: 38, width: "auto", maxWidth: 180, objectFit: "contain", flexShrink: 0 }}
            onError={() => setLogoError(true)}
          />
        )}
        <span
          className="header-hide-mobile"
          style={{
            color: "var(--color-text-primary)",
            fontSize: "0.9rem",
            fontWeight: 700,
            letterSpacing: "0.01em",
            lineHeight: 1.15,
          }}
        >
          {BRAND_NAME}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Estado del canal en vivo (solo roles que reciben el stream) */}
        {user?.cargo && user.cargo !== "Trabajador" && (
          <span
            title={realtimeStatus === "live" ? t("header.liveOnTitle") : t("header.liveOffTitle")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "9999px",
              fontSize: "0.7rem",
              fontWeight: 600,
              border: realtimeStatus === "live"
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(139,148,158,0.25)",
              backgroundColor: realtimeStatus === "live"
                ? "rgba(34,197,94,0.12)"
                : "rgba(139,148,158,0.1)",
              color: realtimeStatus === "live" ? "#22c55e" : "var(--color-text-secondary)",
            }}
          >
            <span
              className={realtimeStatus === "live" ? "live-dot-pulse" : undefined}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: realtimeStatus === "live" ? "#22c55e" : "var(--color-text-secondary)",
              }}
            />
            <span className="header-hide-mobile">
              {realtimeStatus === "live" ? t("header.liveOn") : t("header.liveOff")}
            </span>
            <style>{`
              .live-dot-pulse { animation: live-dot-pulse 2s ease-in-out infinite; }
              @keyframes live-dot-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
                50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
              }
            `}</style>
          </span>
        )}

        {/* Filter lifecycle warning */}
        {filtrosEnRiesgo > 0 && (
          <Link
            href="/vida-util-filtros"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              fontSize: "0.7rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
            title={t("header.filtersAtRiskTitle", { count: filtrosEnRiesgo })}
          >
            <AlertTriangle size={14} />
            <span className="header-hide-mobile">
              {t("header.filtersAtRiskBadge", {
                count: filtrosEnRiesgo,
                label: filtrosEnRiesgo > 1
                  ? t("header.filtersAtRiskLabelPlural")
                  : t("header.filtersAtRiskLabelSingular"),
              })}
            </span>
          </Link>
        )}

        {/* Alertas activas — link a historial */}
        <Link
          href="/historial-alertas"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: alertasActivas > 0 ? "#ef4444" : "var(--color-text-secondary)",
            display: "flex",
            position: "relative",
            textDecoration: "none",
          }}
          title={t("header.alertsActiveTitle", { count: alertasActivas })}
          aria-label={t("header.viewActiveAlerts")}
        >
          <Bell size={20} />
          {alertasActivas > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: "0.6rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {alertasActivas > 9 ? "9+" : alertasActivas}
            </span>
          )}
        </Link>

        {/* Role badge */}
        {user?.cargo && (
          <span
            className="header-hide-mobile"
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              borderRadius: "9999px",
              letterSpacing: "0.03em",
              backgroundColor:
                user.cargo === "Administrador"
                  ? "rgba(239,68,68,0.15)"
                  : user.cargo === "Supervisor"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(139,148,158,0.15)",
              color:
                user.cargo === "Administrador"
                  ? "#ef4444"
                  : user.cargo === "Supervisor"
                    ? "#3b82f6"
                    : "var(--color-text-secondary)",
              border: `1px solid ${
                user.cargo === "Administrador"
                  ? "rgba(239,68,68,0.3)"
                  : user.cargo === "Supervisor"
                    ? "rgba(59,130,246,0.3)"
                    : "rgba(139,148,158,0.3)"
              }`,
            }}
          >
            {ROLE_KEYS[user.cargo] ? t(ROLE_KEYS[user.cargo]) : user.cargo}
          </span>
        )}

        {/* User avatar + dropdown menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label={t("header.userMenu")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "0.5rem",
            }}
          >
            <span
              className="header-hide-mobile"
              style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}
            >
              {user?.nombre}
            </span>
            {avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt=""
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid var(--color-accent)",
                  flexShrink: 0,
                }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  border: "2px solid var(--color-accent)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 0.5rem)",
                width: 220,
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "0.5rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {/* User info */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>{user?.nombre}</p>
                <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
                  {user?.cargo && ROLE_KEYS[user.cargo] ? t(ROLE_KEYS[user.cargo]) : user?.cargo} — {user?.rut}
                </p>
              </div>

              {/* Menu items */}
              <div style={{ padding: "0.375rem" }}>
                <Link
                  href="/ayuda"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.625rem",
                    borderRadius: "0.375rem",
                    color: "var(--color-text-secondary)",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                  className="sidebar-link"
                >
                  <User size={16} />
                  {t("header.helpAndSupport")}
                </Link>
                <button
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: t("sidebar.logoutConfirmTitle"),
                      text: t("sidebar.logoutConfirmText"),
                      icon: "question",
                      showCancelButton: true,
                      confirmButtonText: t("sidebar.logoutConfirmYes"),
                      cancelButtonText: t("common.cancel"),
                      background: "var(--color-bg-card)",
                      color: "var(--color-text-primary)",
                      confirmButtonColor: "#f97316",
                    });
                    if (result.isConfirmed) {
                      logoutAction();
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.625rem",
                    borderRadius: "0.375rem",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <LogOut size={16} />
                  {t("sidebar.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .header-hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
    </div>
  );
}
