import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el valor inicial de inmediato", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 350));
    expect(result.current).toBe("a");
  });

  it("no actualiza antes del delay y sí al cumplirse", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe("a"); // aún no pasó el delay

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b"); // al cumplirse el delay toma el nuevo valor
  });

  it("coalesce cambios rápidos: solo aplica el último tras el delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "c" }); // reinicia el timer del debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("a"); // no pasaron 350ms desde el último cambio

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("c"); // se salta el valor intermedio "b"
  });

  it("mantiene la identidad del objeto: valor asentado === referencia viva", () => {
    const objA = { tipo: "FILTRO" };
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: objA } }
    );
    // En reposo, el debounced es la MISMA referencia que el valor vivo. Esta
    // igualdad por referencia es la que usa `filtersSettling` en las vistas.
    expect(result.current).toBe(objA);

    const objB = { tipo: "BATERIA" };
    rerender({ value: objB });
    expect(result.current).toBe(objA); // asentándose: sigue apuntando al viejo

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(objB); // asentado: ahora coincide con el vivo
  });
});
