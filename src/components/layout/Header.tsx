"use client";

import { Bell, Settings, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/api/client";
import type { FilterStatus } from "@/types";
import { getUserFromCookie } from "@/utils/cookies";

export default function Header() {
  const [user, setUser] = useState<{nombre?: string; cargo?: string} | null>(null);
  const [filtrosEnRiesgo, setFiltrosEnRiesgo] = useState<number>(0);

  useEffect(() => {
    setUser(getUserFromCookie());

    // Fetch filter lifecycle warnings
    async function fetchFilterWarnings() {
      try {
        const data: FilterStatus[] = await api.filterLifecycle.proximosVencer();
        setFiltrosEnRiesgo(data.length);
      } catch {
        // silently fail
      }
    }
    fetchFilterWarnings();
    const interval = setInterval(fetchFilterWarnings, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials = user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U";

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.75rem 0",
      marginBottom: "1.5rem",
      borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{
        color: "var(--color-accent)",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}>
        INDUSTRIAL COCKPIT
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Filter lifecycle warning indicator */}
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
              transition: "background-color 0.15s",
            }}
            title={`${filtrosEnRiesgo} filtro(s) requieren atención`}
          >
            <AlertTriangle size={14} />
            {filtrosEnRiesgo} filtro{filtrosEnRiesgo > 1 ? "s" : ""} en riesgo
          </Link>
        )}
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", position: "relative" }}>
          <Bell size={20} />
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex" }}>
          <Settings size={20} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: "0.85rem",
          border: "2px solid var(--color-accent)",
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
