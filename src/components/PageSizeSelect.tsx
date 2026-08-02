"use client";

import { useT } from "@/i18n/LanguageProvider";

interface Props {
  value: number;
  options?: number[];
  onChange: (size: number) => void;
  disabled?: boolean;
}

/**
 * Selector de registros por página para tablas paginadas de servidor.
 * El valor persistido vive en el componente padre (localStorage por vista):
 * aquí solo se pinta y se notifica el cambio.
 */
export default function PageSizeSelect({ value, options = [20, 50, 100, 200], onChange, disabled }: Props) {
  const t = useT();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
      {t("common.pageSize")}
      <select
        className="input-field"
        style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}
