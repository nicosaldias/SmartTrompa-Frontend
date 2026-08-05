import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  interpretNivelAjuste,
  nivelAjusteColor,
  interpretNivelAtollo,
  nivelAtolloColor,
  getAlertNivel,
  contarNivelesFiltro,
  esMedicionReciente,
  SIN_SENAL_MS,
} from "@/utils/sensorMappings";
import type { AlertaHistorial, JornadaTrabajo, NivelAlerta, TipoAlerta } from "@/types";

describe("esMedicionReciente", () => {
  const ahora = new Date("2026-07-30T20:00:00Z").getTime();

  it("una medición dentro del umbral es señal viva; una más vieja no", () => {
    const dentro = new Date(ahora - SIN_SENAL_MS + 1000).toISOString();
    const fuera = new Date(ahora - SIN_SENAL_MS - 1000).toISOString();
    expect(esMedicionReciente(dentro, ahora)).toBe(true);
    expect(esMedicionReciente(fuera, ahora)).toBe(false);
  });

  it("sin timestamp o con timestamp inválido no hay señal", () => {
    expect(esMedicionReciente(undefined, ahora)).toBe(false);
    expect(esMedicionReciente(null, ahora)).toBe(false);
    expect(esMedicionReciente("no-es-fecha", ahora)).toBe(false);
  });
});

function mkAlerta(rut: string, tipo: TipoAlerta, nivel: NivelAlerta, id = 1): AlertaHistorial {
  return { id, tipo, nivel, rutTrabajador: rut, timestamp: "2026-07-20T10:00:00Z", activa: true };
}

function mkJornada(rut: string, id = 1): JornadaTrabajo {
  return { id, rutUsuario: rut, idSupervisor: "sup-1", inicio: "2026-07-20T08:00:00Z", terminada: false };
}

// --- Lector de tokens de globals.css -----------------------------------------
// Estas funciones ya no devuelven un hex sino un `var(--color-*)`, y eso NO se
// puede verificar sólo con el string del token: el bug que la tokenizacion vino
// a arreglar era precisamente que un color existiera en un tema y no en el otro
// (las .badge-* llevaban el hex de la paleta OSCURA escrito a mano y el tema
// claro no las tocaba). Un test que se conforme con "devuelve var(--color-red)"
// pasaria igual aunque alguien borrara --color-red del bloque de tema claro y
// dejara ese texto sin color en media aplicacion.
// Por eso se lee globals.css y se resuelve el token en LOS DOS bloques de tema.
// (Se resuelve desde process.cwd(), la raiz que fija vitest.config.mts, y no
//  desde import.meta.url: bajo el entorno jsdom esa URL no es de esquema file.)
const CSS_GLOBAL = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
  // Los bloques :root llevan comentarios largos que pueden contener hexes de
  // ejemplo (los valores viejos de la auditoria); si no se quitan, el parser
  // leeria un valor que no esta vigente.
  .replace(/\/\*[\s\S]*?\*\//g, "");

function tokensDelBloque(selectorRegex: RegExp): Record<string, string> {
  const bloque = CSS_GLOBAL.match(selectorRegex);
  if (!bloque) throw new Error(`No se encontro el bloque de tema ${selectorRegex} en globals.css`);
  const tokens: Record<string, string> = {};
  for (const [, nombre, valor] of bloque[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[nombre] = valor.trim();
  }
  return tokens;
}

// `:root\s*\{` no matchea `:root[data-theme="light"] {` porque el `[` no es ni
// espacio ni llave, asi que cada regex cae en su bloque y solo en el suyo.
const TOKENS_TEMA = {
  oscuro: tokensDelBloque(/:root\s*\{([^}]*)\}/),
  claro: tokensDelBloque(/:root\[data-theme="light"\]\s*\{([^}]*)\}/),
};

/** Resuelve `var(--x)` contra el bloque del tema pedido. Falla si el token no
 *  esta declarado en ESE tema, que es el modo de fallo que interesa cazar. */
function resuelveEnTema(valor: string, tema: keyof typeof TOKENS_TEMA): string {
  const nombre = valor.match(/^var\((--[\w-]+)\)$/)?.[1];
  expect(nombre, `"${valor}" deberia ser un token var(--...), no un color literal`).toBeTruthy();
  const resuelto = TOKENS_TEMA[tema][nombre!];
  expect(resuelto, `${nombre} no esta declarado en el tema ${tema} de globals.css`).toBeTruthy();
  return resuelto;
}

// Convencion D3 (la de la app movil): 1 = Ajustado, 0 = Desajustado.
describe("sensorMappings - interpretNivelAjuste", () => {
  it("retorna '--' cuando el valor es null o undefined", () => {
    expect(interpretNivelAjuste(null)).toBe("--");
    expect(interpretNivelAjuste(undefined)).toBe("--");
  });

  it("retorna 'Desajustado' cuando el valor es 0", () => {
    expect(interpretNivelAjuste(0)).toBe("Desajustado");
  });

  it("retorna 'Ajustado' cuando el valor es 1", () => {
    expect(interpretNivelAjuste(1)).toBe("Ajustado");
  });
});

describe("sensorMappings - nivelAjusteColor", () => {
  // El toContain("text-secondary") original tambien pasaba con un literal tipo
  // "color-text-secondary-oscuro"; se aprieta al token exacto ahora que el resto
  // del describe lo hace.
  it("retorna el token de texto secundario cuando falta el valor", () => {
    expect(nivelAjusteColor(null)).toBe("var(--color-text-secondary)");
    expect(resuelveEnTema(nivelAjusteColor(null), "claro")).toBe("#57606a");
    expect(resuelveEnTema(nivelAjusteColor(null), "oscuro")).toBe("#8b949e");
  });

  // Antes esto fijaba los hexes #ef4444 / #22c55e. Ese valor concreto era justo
  // el problema: eran los de la paleta OSCURA quemados en el codigo, de modo que
  // en tema claro "Ajustado" salia en verde limon sobre papel (2.28:1). El test
  // los daba por buenos porque solo comparaba strings.
  it("retorna el TOKEN rojo cuando está desajustado (0) y el verde cuando está ajustado (1)", () => {
    expect(nivelAjusteColor(0)).toBe("var(--color-red)");
    expect(nivelAjusteColor(1)).toBe("var(--color-green)");
  });

  // Este es el caso que sustituye al hex: documenta a que resuelve cada token en
  // cada tema y, sobre todo, revienta si un tema se queda sin el token. En
  // oscuro el verde vale exactamente el mismo hex que estaba escrito a mano
  // antes, o sea que ese tema no cambio; el rojo oscuro si se aclaro a red-400
  // (#f87171) porque el #ef4444 anterior no llegaba a AA ni sobre .card.
  // En claro los dos bajaron una parada mas (#1a7f37 -> #166534 y
  // #cf222e -> #b91c1c): aprobaban sobre .card pero se caian sobre el peor fondo
  // del tema, la fila de tabla con :hover encima del fondo de pagina.
  it.each([
    ["oscuro", 0, "#f87171"],
    ["oscuro", 1, "#22c55e"],
    ["claro", 0, "#b91c1c"],
    ["claro", 1, "#166534"],
  ] as const)("en tema %s el ajuste %s se pinta %s", (tema, valor, hex) => {
    expect(resuelveEnTema(nivelAjusteColor(valor), tema)).toBe(hex);
  });
});

// Convencion D4: prediccion ML continua 0-100; -1/null = sin dato; cortes 60/80.
describe("sensorMappings - interpretNivelAtollo", () => {
  it.each([
    [0, "Baja"],
    [45, "Baja"],
    [60, "Baja"],
    [61, "Media"],
    [80, "Media"],
    [81, "Alta"],
    [100, "Alta"],
  ])("interpreta prediccion %s%% como '%s'", (input, expected) => {
    expect(interpretNivelAtollo(input)).toBe(expected);
  });

  it("retorna '--' cuando el valor falta o es -1 (sin dato aun)", () => {
    expect(interpretNivelAtollo(null)).toBe("--");
    expect(interpretNivelAtollo(undefined)).toBe("--");
    expect(interpretNivelAtollo(-1)).toBe("--");
  });
});

describe("sensorMappings - nivelAtolloColor", () => {
  // Misma correccion que en nivelAjusteColor: los tres hexes eran los de la
  // paleta oscura escritos a mano. Las dos funciones se pintan en lineas
  // contiguas de la misma tarjeta, asi que se mueven juntas o el par se parte
  // en tema claro.
  it.each([
    [30, "var(--color-green)"],
    [70, "var(--color-yellow)"],
    [90, "var(--color-red)"],
  ])("color para prediccion %s%% es el token %s", (input, expected) => {
    expect(nivelAtolloColor(input)).toBe(expected);
  });

  // OJO al ambar: el hex viejo era #f59e0b y --color-yellow vale #eab308 en
  // oscuro, o sea que el token NO es una traduccion 1:1 — hay un corrimiento de
  // tono deliberado (ver el comentario en sensorMappings.ts). Se deja fijado
  // aqui para que ese corrimiento sea una decision visible y no una sorpresa.
  it.each([
    ["oscuro", 30, "#22c55e"],
    ["oscuro", 70, "#eab308"],
    ["oscuro", 90, "#f87171"],
    ["claro", 30, "#166534"],
    ["claro", 70, "#8a5c00"],
    ["claro", 90, "#b91c1c"],
  ] as const)("en tema %s la prediccion %s%% se pinta %s", (tema, valor, hex) => {
    expect(resuelveEnTema(nivelAtolloColor(valor), tema)).toBe(hex);
  });

  it("usa el token de texto secundario para -1/null (sin dato)", () => {
    expect(nivelAtolloColor(-1)).toBe("var(--color-text-secondary)");
    expect(nivelAtolloColor(null)).toBe("var(--color-text-secondary)");
    expect(resuelveEnTema(nivelAtolloColor(-1), "claro")).toBe("#57606a");
    expect(resuelveEnTema(nivelAtolloColor(-1), "oscuro")).toBe("#8b949e");
  });
});

describe("sensorMappings - getAlertNivel", () => {
  it("retorna el nivel de la alerta que coincide con rut y tipo", () => {
    const alertas = [
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO"),
      mkAlerta("22.222.222-2", "BATERIA", "ALERTA", 2),
    ];
    expect(getAlertNivel(alertas, "11.111.111-1", "FILTRO")).toBe("CRITICO");
    expect(getAlertNivel(alertas, "22.222.222-2", "BATERIA")).toBe("ALERTA");
  });

  it("retorna OK si el trabajador no tiene alerta de ese tipo", () => {
    const alertas = [mkAlerta("11.111.111-1", "BATERIA", "CRITICO")];
    expect(getAlertNivel(alertas, "11.111.111-1", "FILTRO")).toBe("OK");
    expect(getAlertNivel([], "11.111.111-1", "FILTRO")).toBe("OK");
  });

  it("con varias alertas del mismo rut+tipo gana la MAS SEVERA (una OK vieja no oculta un CRITICO)", () => {
    const escalada = [
      mkAlerta("11.111.111-1", "FILTRO", "ALERTA"),
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO", 2),
    ];
    expect(getAlertNivel(escalada, "11.111.111-1", "FILTRO")).toBe("CRITICO");

    const okViejaPrimero = [
      mkAlerta("11.111.111-1", "FILTRO", "OK"),
      mkAlerta("11.111.111-1", "FILTRO", "CRITICO", 2),
    ];
    expect(getAlertNivel(okViejaPrimero, "11.111.111-1", "FILTRO")).toBe("CRITICO");

    const soloOk = [mkAlerta("11.111.111-1", "FILTRO", "OK")];
    expect(getAlertNivel(soloOk, "11.111.111-1", "FILTRO")).toBe("OK");
  });
});

describe("sensorMappings - contarNivelesFiltro", () => {
  it("cuenta trabajadores activos por severidad de su alerta FILTRO (sin alerta = bajo)", () => {
    const jornadas = [mkJornada("a", 1), mkJornada("b", 2), mkJornada("c", 3), mkJornada("d", 4)];
    const alertas = [
      mkAlerta("a", "FILTRO", "CRITICO"),
      mkAlerta("b", "FILTRO", "ALERTA", 2),
      mkAlerta("c", "FILTRO", "OK", 3),
      // "d" sin alerta FILTRO → bajo
    ];
    expect(contarNivelesFiltro(jornadas, alertas)).toEqual({ bajo: 2, medio: 1, alto: 1 });
  });

  it("escenario del bug: 7 trabajadores con FILTRO CRITICO en tabla → tarjeta 0/0/7", () => {
    const ruts = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"];
    const jornadas = ruts.map((r, i) => mkJornada(r, i + 1));
    const alertas = ruts.map((r, i) => mkAlerta(r, "FILTRO", "CRITICO", i + 1));
    expect(contarNivelesFiltro(jornadas, alertas)).toEqual({ bajo: 0, medio: 0, alto: 7 });
  });

  it("ignora alertas de trabajadores sin jornada activa y otras que no son FILTRO; el total = jornadas", () => {
    const jornadas = [mkJornada("a", 1), mkJornada("b", 2)];
    const alertas = [
      mkAlerta("zz", "FILTRO", "CRITICO"), // sin jornada activa → no cuenta
      mkAlerta("a", "BATERIA", "CRITICO", 2), // otro tipo → no cuenta como filtro
    ];
    const counts = contarNivelesFiltro(jornadas, alertas);
    expect(counts).toEqual({ bajo: 2, medio: 0, alto: 0 });
    expect(counts.bajo + counts.medio + counts.alto).toBe(jornadas.length);
  });
});
