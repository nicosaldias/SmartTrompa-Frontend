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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getUserFromCookie } from "@/utils/cookies";
import Swal from "sweetalert2";

type Cargo = "Administrador" | "Supervisor" | "Trabajador";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Cargo[];
}

const ALL_ROLES: Cargo[] = ["Administrador", "Supervisor"];
const ADMIN_ONLY: Cargo[] = ["Administrador"];

const navItems: NavItem[] = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/cuadrilla", label: "Estado de Cuadrilla", icon: Users, roles: ALL_ROLES },
  { href: "/historial-alertas", label: "Historial de Alertas", icon: ClipboardList, roles: ALL_ROLES },
  { href: "/visualizacion", label: "Historico de Cuadrilla", icon: Eye, roles: ALL_ROLES },
  { href: "/trabajadores", label: "Gestion de Trabajadores", icon: UserCog, roles: ADMIN_ONLY },
  { href: "/umbrales", label: "Gestion de Umbrales", icon: Sliders, roles: ADMIN_ONLY },
  { href: "/filtros", label: "Filtros y Respiradores", icon: Wind, roles: ALL_ROLES },
  { href: "/vida-util-filtros", label: "Vida Util de Filtros", icon: Timer, roles: ALL_ROLES },
  { href: "/reportes", label: "Reportes", icon: FileBarChart, roles: ALL_ROLES },
  { href: "/roles-ubicaciones", label: "Roles y Ubicaciones", icon: MapPin, roles: ADMIN_ONLY },
  { href: "/ayuda", label: "Ayuda", icon: HelpCircle, roles: ALL_ROLES },
];

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
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
            <Wind size={22} color="white" />
          </div>
          {!isCollapsed && (
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                SmartTrompa
              </p>
              <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Industrial Intelligence
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
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

        {/* Bottom: collapse toggle + logout */}
        <div style={{ padding: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
          {/* Collapse toggle (hidden on mobile) */}
          <button
            onClick={onToggleCollapse}
            className="sidebar-link sidebar-collapse-btn"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              justifyContent: isCollapsed ? "center" : undefined,
              marginBottom: "0.25rem",
            }}
            title={isCollapsed ? "Expandir menu" : "Colapsar menu"}
          >
            {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!isCollapsed && <span>Colapsar</span>}
          </button>
          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: "Cerrar sesion",
                text: "Estas seguro que deseas cerrar sesion?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Si, cerrar sesion",
                cancelButtonText: "Cancelar",
                background: "#1c2333",
                color: "#e6edf3",
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
              justifyContent: isCollapsed ? "center" : undefined,
            }}
            title={isCollapsed ? "Cerrar sesion" : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Cerrar sesion</span>}
          </button>
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
          padding: 1.5rem 1rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-height: 73px;
        }
        .sidebar-collapsed .sidebar-logo {
          justify-content: center;
          padding: 1.5rem 0.5rem;
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
