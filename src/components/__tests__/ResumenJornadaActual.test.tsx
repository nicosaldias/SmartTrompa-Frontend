import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import ResumenJornadaActual from "@/components/ResumenJornadaActual";
import type { AlertaHistorial, JornadaTrabajo, MedicionesAmbientales, NivelAlerta } from "@/types";

function mkJornada(rut: string, id: number): JornadaTrabajo {
  return { id, rutUsuario: rut, idSupervisor: "sup-1", inicio: "2026-07-20T08:00:00Z", terminada: false };
}

function mkAlertaFiltro(rut: string, nivel: NivelAlerta, id: number): AlertaHistorial {
  return { id, tipo: "FILTRO", nivel, rutTrabajador: rut, timestamp: "2026-07-20T10:00:00Z", activa: true };
}

function mkMedicion(nivelAtollo: number): MedicionesAmbientales {
  return { id: 1, jornadaId: 1, timestamp: "2026-07-20T10:00:00Z", nivelAtollo };
}

function renderResumen(props: {
  jornadas: JornadaTrabajo[];
  medicionesMap: Record<string, MedicionesAmbientales | null>;
  alertas: AlertaHistorial[];
}) {
  return render(
    <LanguageProvider initialLang="es">
      <ResumenJornadaActual {...props} />
    </LanguageProvider>
  );
}

// Extrae los 3 contadores (verde/ámbar/rojo) de la tarjeta de filtros por color.
function contadoresFiltro(container: HTMLElement): { bajo: string; medio: string; alto: string } {
  const span = (color: string) =>
    Array.from(container.querySelectorAll("span")).find((s) => s.style.color === color);
  return {
    bajo: span("rgb(34, 197, 94)")?.textContent ?? "",
    medio: span("rgb(245, 158, 11)")?.textContent ?? "",
    alto: span("rgb(239, 68, 68)")?.textContent ?? "",
  };
}

describe("ResumenJornadaActual - tarjeta Estado Filtros", () => {
  it("escenario del bug reportado: alertas FILTRO CRITICO mandan aunque el sensor diga atollo bajo", () => {
    const ruts = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"];
    const jornadas = ruts.map((r, i) => mkJornada(r, i + 1));
    // La medición placeholder dice atollo=0 ("baja") para todos — antes del fix
    // esto pintaba 7 en verde contradiciendo la tabla.
    const medicionesMap = Object.fromEntries(ruts.map((_, i) => [String(i + 1), mkMedicion(0)]));
    const alertas = ruts.map((r, i) => mkAlertaFiltro(r, "CRITICO", i + 1));

    const { container } = renderResumen({ jornadas, medicionesMap, alertas });
    expect(contadoresFiltro(container)).toEqual({ bajo: "0", medio: "0", alto: "7" });
  });

  it("cuenta mixto por severidad de alerta y default verde sin alerta; total = trabajadores activos", () => {
    const jornadas = [mkJornada("a", 1), mkJornada("b", 2), mkJornada("c", 3)];
    const alertas = [mkAlertaFiltro("a", "CRITICO", 1), mkAlertaFiltro("b", "ALERTA", 2)];

    const { container } = renderResumen({ jornadas, medicionesMap: {}, alertas });
    expect(contadoresFiltro(container)).toEqual({ bajo: "1", medio: "1", alto: "1" });
  });
});
