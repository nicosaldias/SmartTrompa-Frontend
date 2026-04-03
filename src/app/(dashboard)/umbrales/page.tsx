import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import { Sliders, Cpu, Activity, ScrollText } from "lucide-react";

export const metadata = {
  title: "Gestión de Umbrales - SmartTrompa",
};

export default async function UmbralesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  const stats = [
    {
      label: "MOTOR IA ACTIVO",
      value: "99.4%",
      badge: "OPTIMIZADO",
      badgeColor: "#22c55e",
      icon: Cpu,
    },
    {
      label: "DETECCIÓN DE ANOMALÍAS",
      value: "0.12s",
      badge: "LATENCIA",
      badgeColor: "var(--color-text-secondary)",
      icon: Activity,
    },
    {
      label: "LOGS DE SISTEMA",
      value: "2.4k",
      badge: "EVENTOS/H",
      badgeColor: "var(--color-text-secondary)",
      icon: ScrollText,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          Gestión de Umbrales
        </h1>
      </div>

      {/* Main card */}
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          position: "relative",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        {/* Decorative background "00" */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "12rem",
            fontWeight: 900,
            color: "var(--color-border)",
            opacity: 0.3,
            pointerEvents: "none",
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          00
        </div>

        {/* Icon */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "1rem",
            backgroundColor: "rgba(249,115,22,0.1)",
            marginBottom: "1.5rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Sliders size={28} color="#f97316" />
        </div>

        <h2
          style={{
            fontWeight: 700,
            marginBottom: "0.75rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          Funcionalidad en Standby
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
            position: "relative",
            zIndex: 1,
          }}
        >
          Los umbrales de alertas son actualmente gestionados de forma autónoma
          por el motor de inteligencia artificial del sensor. Esta sección estará
          disponible en una versión futura de la plataforma.
        </p>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.65rem",
            color: "var(--color-text-secondary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            position: "relative",
            zIndex: 1,
          }}
        >
          Próxima actualización: Módulo de ajustes manuales
        </p>

        {/* EN DESARROLLO badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.25rem",
            padding: "0.4rem 1rem",
            borderRadius: "9999px",
            backgroundColor: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.25)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#f97316",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#f97316",
              letterSpacing: "0.05em",
            }}
          >
            EN DESARROLLO
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isGreen = stat.badgeColor === "#22c55e";
          return (
            <div
              key={stat.label}
              className="card"
              style={{
                padding: "1.25rem 1.5rem",
                borderLeft: "3px solid var(--color-accent)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </span>
                <Icon size={16} color="var(--color-text-secondary)" />
              </div>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: isGreen ? "#22c55e" : "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
