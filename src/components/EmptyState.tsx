"use client";

// Estado vacío único de la plataforma (antes convivían 3 estilos distintos).
// `children` es el slot de acción/contexto: CTA, defaults vigentes, links.

interface Props {
  icon?: string;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}

export default function EmptyState({ icon = "📋", title, hint, children }: Props) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }} aria-hidden>
        {icon}
      </div>
      <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.375rem" }}>
        {title}
      </p>
      {hint && (
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{hint}</p>
      )}
      {children}
    </div>
  );
}
