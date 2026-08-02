import { describe, it, expect } from "vitest";
import {
  agruparPorDiaYSupervisor,
  bloqueDeJornada,
  colorSupervisor,
  duracionMinutos,
  formatDuracion,
  rangoHorario,
  rangoSemana,
  SIN_SUPERVISOR,
} from "@/utils/historicoCuadrilla";
import type { JornadaTrabajo } from "@/types";

function jornada(id: number, inicio: string, fin: string | null, supervisor?: string): JornadaTrabajo {
  return {
    id,
    inicio,
    fin,
    terminada: true,
    rutUsuario: `${id}-trab`,
    idSupervisor: supervisor,
  } as unknown as JornadaTrabajo;
}

describe("agruparPorDiaYSupervisor", () => {
  it("agrupa por fecha local de inicio, días descendentes y jornadas recientes primero", () => {
    const grupos = agruparPorDiaYSupervisor([
      jornada(1, "2026-08-01T08:00", "2026-08-01T12:00", "sup-a"),
      jornada(2, "2026-08-02T09:00", "2026-08-02T13:00", "sup-a"),
      jornada(3, "2026-08-01T14:00", "2026-08-01T18:00", "sup-a"),
    ]);

    expect(grupos.map((g) => g.diaKey)).toEqual(["2026-08-02", "2026-08-01"]);
    expect(grupos[1].supervisores[0].jornadas.map((j) => j.id)).toEqual([3, 1]);
  });

  it("dentro del día ordena supervisores por cantidad de jornadas y agrupa los sin supervisor", () => {
    const grupos = agruparPorDiaYSupervisor([
      jornada(1, "2026-08-01T08:00", "2026-08-01T12:00", "sup-b"),
      jornada(2, "2026-08-01T09:00", "2026-08-01T13:00", "sup-a"),
      jornada(3, "2026-08-01T10:00", "2026-08-01T14:00", "sup-a"),
      jornada(4, "2026-08-01T11:00", "2026-08-01T15:00", undefined),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].supervisores.map((s) => s.supervisorRut)).toEqual([
      "sup-a", "sup-b", SIN_SUPERVISOR,
    ]);
  });
});

describe("duración", () => {
  it("calcula minutos y formatea en horas/minutos", () => {
    expect(duracionMinutos("2026-08-01T08:00", "2026-08-01T15:25")).toBe(445);
    expect(formatDuracion(445)).toBe("7 h 25 min");
    expect(formatDuracion(45)).toBe("45 min");
    expect(formatDuracion(120)).toBe("2 h");
    expect(formatDuracion(0)).toBe("—");
  });

  it("sin fin (jornada abierta) la duración es 0 → '—'", () => {
    expect(duracionMinutos("2026-08-01T08:00", null)).toBe(0);
  });
});

describe("rangoSemana", () => {
  it("devuelve lunes-domingo de la semana del día de referencia", () => {
    // 2026-08-01 es sábado → su semana parte el lunes 27 de julio.
    const r = rangoSemana(new Date(2026, 7, 1));
    expect(r.desde).toBe("2026-07-27T00:00");
    expect(r.hasta).toBe("2026-08-02T23:59");
    expect(r.dias).toHaveLength(7);
  });

  it("offset navega semanas completas", () => {
    const r = rangoSemana(new Date(2026, 7, 1), -1);
    expect(r.desde).toBe("2026-07-20T00:00");
    expect(r.hasta).toBe("2026-07-26T23:59");
  });

  it("un lunes es el inicio de su propia semana", () => {
    const r = rangoSemana(new Date(2026, 6, 27));
    expect(r.desde).toBe("2026-07-27T00:00");
  });
});

describe("rangoHorario y bloques", () => {
  it("deriva el eje de los datos con 1 h de margen y clamp a [0,24]", () => {
    const { hMin, hMax } = rangoHorario([
      jornada(1, "2026-08-01T08:00", "2026-08-01T12:30"),
      jornada(2, "2026-08-01T14:00", "2026-08-01T18:00"),
    ]);
    expect(hMin).toBe(7);
    expect(hMax).toBe(19);
  });

  it("sin jornadas usa 6–20 por defecto", () => {
    expect(rangoHorario([])).toEqual({ hMin: 6, hMax: 20 });
  });

  it("posiciona el bloque en % del eje y recorta al rango", () => {
    // Eje 7–19 (12 h = 720 min). Jornada 08:00→12:00: top = 60/720, alto = 240/720.
    const b = bloqueDeJornada(jornada(1, "2026-08-01T08:00", "2026-08-01T12:00"), 7, 19);
    expect(b.topPct).toBeCloseTo(8.33, 1);
    expect(b.heightPct).toBeCloseTo(33.33, 1);
  });

  it("una jornada muy corta conserva altura mínima clickeable", () => {
    const b = bloqueDeJornada(jornada(1, "2026-08-01T08:00", "2026-08-01T08:02"), 7, 19);
    expect(b.heightPct).toBe(1.5);
  });
});

describe("colorSupervisor", () => {
  it("es estable para la misma clave y devuelve un color de la paleta", () => {
    expect(colorSupervisor("11.111.111-1")).toBe(colorSupervisor("11.111.111-1"));
    expect(colorSupervisor("11.111.111-1")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
