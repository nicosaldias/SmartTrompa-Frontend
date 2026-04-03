"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

const navItems = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/cuadrilla", label: "Estado de Cuadrilla", icon: Users },
  { href: "/historial-alertas", label: "Historial de Alertas", icon: ClipboardList },
  { href: "/visualizacion", label: "Visualización de Cuadrilla", icon: Eye },
  { href: "/trabajadores", label: "Gestión de Trabajadores", icon: UserCog },
  { href: "/umbrales", label: "Gestión de Umbrales", icon: Sliders },
  { href: "/filtros", label: "Filtros y Respiradores", icon: Wind },
  { href: "/vida-util-filtros", label: "Vida Útil de Filtros", icon: Timer },
  { href: "/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/roles-ubicaciones", label: "Roles y Ubicaciones", icon: MapPin },
  { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-secondary)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "1.5rem 1rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
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
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
            SmartTrompa
          </p>
          <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Industrial Intelligence
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              style={{ marginBottom: "0.125rem" }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0.75rem 0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={() => {
            logoutAction();
          }}
          className="sidebar-link"
          style={{ width: "100%", background: "none", border: "none" }}
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
