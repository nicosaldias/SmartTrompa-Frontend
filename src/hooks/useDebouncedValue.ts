import { useEffect, useState } from "react";

/**
 * Devuelve una version "retrasada" de `value` que solo se actualiza `delayMs`
 * despues del ultimo cambio. Sirve para auto-aplicar filtros sin disparar una
 * consulta por cada tecla/edicion intermedia (ej: rango de fechas).
 *
 * Los selects tambien pasan por aca; el retraso es corto y se percibe inmediato.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
