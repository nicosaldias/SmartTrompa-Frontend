"use client";

// Leyenda compacta del semáforo de severidad. Va EN las vistas de datos:
// antes la única explicación vivía enterrada en una FAQ de Ayuda.

import { useT } from "@/i18n/LanguageProvider";
import { NIVEL_COLORS } from "@/utils/alertaTokens";

export default function LeyendaSemaforo() {
  const t = useT();
  const items = [
    { color: NIVEL_COLORS.OK, label: t("leyenda.ok") },
    { color: NIVEL_COLORS.ALERTA, label: t("leyenda.alerta") },
    { color: NIVEL_COLORS.CRITICO, label: t("leyenda.critico") },
  ];
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.875rem",
      fontSize: "0.7rem", color: "var(--color-text-secondary)",
    }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", backgroundColor: i.color, flexShrink: 0,
          }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
