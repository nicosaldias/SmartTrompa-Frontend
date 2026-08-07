"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Eye,
  UserCog,
  Sliders,
  Wind,
  MapPin,
  HelpCircle,
  LogOut,
  Timer,
  FileBarChart,
  ScrollText,
  History,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getUserFromCookie } from "@/utils/cookies";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/types";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { useTheme } from "@/theme/ThemeProvider";
import type { Cargo } from "@/types";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  roles: Cargo[];
}

// El SuperAdministrador ve todo lo que ve un Administrador (opera globalmente
// o dentro de la empresa activa vía cookie st_empresa) y además /empresas.
const ALL_ROLES: Cargo[] = ["Administrador", "Supervisor", "SuperAdministrador"];
const ADMIN_ONLY: Cargo[] = ["Administrador", "SuperAdministrador"];
const SUPERADMIN_ONLY: Cargo[] = ["SuperAdministrador"];
const TRABAJADOR_ONLY: Cargo[] = ["Trabajador"];
const TODOS: Cargo[] = ["Administrador", "Supervisor", "Trabajador", "SuperAdministrador"];

const navItems: NavItem[] = [
  { href: "/empresas", labelKey: "sidebar.empresas", icon: Building2, roles: SUPERADMIN_ONLY },
  { href: "/mi-historial", labelKey: "sidebar.miHistorial", icon: History, roles: TRABAJADOR_ONLY },
  { href: "/resumen", labelKey: "sidebar.resumen", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/cuadrilla", labelKey: "sidebar.cuadrilla", icon: Users, roles: ALL_ROLES },
  { href: "/historial-alertas", labelKey: "sidebar.historialAlertas", icon: ClipboardList, roles: ALL_ROLES },
  { href: "/visualizacion", labelKey: "sidebar.visualizacion", icon: Eye, roles: ALL_ROLES },
  { href: "/trabajadores", labelKey: "sidebar.trabajadores", icon: UserCog, roles: ADMIN_ONLY },
  { href: "/umbrales", labelKey: "sidebar.umbrales", icon: Sliders, roles: ADMIN_ONLY },
  { href: "/filtros", labelKey: "sidebar.filtros", icon: Wind, roles: ADMIN_ONLY },
  { href: "/vida-util-filtros", labelKey: "sidebar.vidaUtilFiltros", icon: Timer, roles: ALL_ROLES },
  { href: "/reportes", labelKey: "sidebar.reportes", icon: FileBarChart, roles: ALL_ROLES },
  { href: "/roles-ubicaciones", labelKey: "sidebar.rolesUbicaciones", icon: MapPin, roles: ADMIN_ONLY },
  { href: "/auditoria", labelKey: "sidebar.auditoria", icon: ScrollText, roles: ADMIN_ONLY },
  { href: "/ayuda", labelKey: "sidebar.ayuda", icon: HelpCircle, roles: TODOS },
];

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const { theme, toggleTheme } = useTheme();
  const [userCargo, setUserCargo] = useState<string | undefined>(undefined);

  useEffect(() => {
    const user = getUserFromCookie();
    setUserCargo(user?.cargo);
  }, []);

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const visibleItems = navItems.filter((item) =>
    userCargo ? item.roles.includes(userCargo as Cargo) : false
  );

  const isCollapsed = collapsed && !isOpen;

  return (
    <>
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""} ${isCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Sobre el cuadro naranja de la línea 103 el blanco medía 2.80:1 contra
                #f97316, bajo el 3:1 de AA para gráficos; --color-on-accent lo deja en
                5.91:1. Por `style` y no por el prop `color=` de lucide, que termina en
                el atributo stroke="" donde var() no resuelve en todos los motores. */}
            <Wind size={22} style={{ color: "var(--color-on-accent)" }} />
          </div>
          {!isCollapsed && (
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                {t("branding.appName")}
              </p>
              <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("sidebar.appSubtitle")}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
          {visibleItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const label = t(labelKey);
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                style={{
                  marginBottom: "0.125rem",
                  justifyContent: isCollapsed ? "center" : undefined,
                  padding: isCollapsed ? "0.625rem" : undefined,
                }}
                title={isCollapsed ? label : undefined}
              >
                <Icon size={18} />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: tema + idioma (misma fila), colapsar, salir, versión */}
        <div style={{ padding: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
          {/* Fila centrada: toggle de tema (claro/oscuro) + selector de idioma (ES/EN) */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              padding: "0.25rem 0 0.5rem",
            }}
          >
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("sidebar.themeLight") : t("sidebar.themeDark")}
              title={theme === "dark" ? t("sidebar.themeLight") : t("sidebar.themeDark")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
                flexShrink: 0,
              }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {!isCollapsed && <LanguageSelector variant="compact" />}
          </div>
          {/* Collapse toggle (hidden on mobile) */}
          <button
            onClick={onToggleCollapse}
            className="sidebar-link sidebar-collapse-btn"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              justifyContent: "center",
              marginBottom: "0.25rem",
            }}
            title={isCollapsed ? t("sidebar.expandMenu") : t("sidebar.collapseMenu")}
          >
            {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!isCollapsed && <span>{t("sidebar.collapse")}</span>}
          </button>
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
            className="sidebar-link"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              justifyContent: "center",
            }}
            title={isCollapsed ? t("sidebar.logout") : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>{t("sidebar.logout")}</span>}
          </button>
          {/* Versión del software */}
          {!isCollapsed && (
            <p
              style={{
                textAlign: "center",
                color: "var(--color-text-secondary)",
                fontSize: "0.72rem",
                opacity: 0.7,
                marginTop: "0.5rem",
                pointerEvents: "none",
              }}
            >
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}
            </p>
          )}
        </div>
      </aside>
      <style>{`
        .sidebar {
          width: 260px;
          min-height: 100vh;
          background-color: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
          transition: width 0.25s ease, transform 0.25s ease;
          overflow-x: hidden;
        }
        .sidebar-collapsed {
          width: 72px;
        }
        .sidebar-logo {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }
        .sidebar-collapsed .sidebar-logo {
          padding: 1.25rem 0.5rem;
        }
        .sidebar-collapse-btn {
          display: flex;
        }

        /* Mobile + Tablet: drawer */
        @media (max-width: 1024px) {
          .sidebar {
            width: 260px;
            transform: translateX(-100%);
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
          .sidebar-collapsed {
            width: 260px;
          }
          .sidebar-collapse-btn {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
