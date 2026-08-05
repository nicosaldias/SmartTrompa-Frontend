// Cálculo de contraste WCAG 2.x para el caso —raro— en que el RELLENO lo elige
// un dato en tiempo de ejecución y por lo tanto la tinta no se puede decidir al
// escribir el estilo.
//
// En el resto de la app el par relleno/tinta se conoce de antemano: el botón es
// naranja siempre, así que su texto es var(--color-on-accent) y punto. Ahí un
// token es mejor que esto, porque queda declarado en globals.css y se audita
// leyendo el CSS. Este módulo es para cuando esa premisa se rompe: el bloque de
// jornada del calendario semanal pinta el color del SUPERVISOR
// (historicoCuadrilla.ts → colorSupervisor), que sale de un hash del rut, y esa
// paleta mezcla rellenos oscuros (#3b82f6) con rellenos claros (#eab308,
// #f97316). Ninguna tinta fija sirve para las dos mitades.
//
// La fórmula es la de la especificación, no un atajo: canal lineal
// (c/12.92 ó ((c+0.055)/1.055)^2.4), luminancia 0.2126R+0.7152G+0.0722B y razón
// (Lc+0.05)/(Lo+0.05). Una heurística tipo "suma de canales > 384" da la
// respuesta equivocada justo en los colores que importan, porque ignora que el
// verde pesa 0.7152 y el azul 0.0722: en la paleta de supervisores el cian
// #06b6d4 suma 400 y el índigo #6366f1 suma 442, o sea que el atajo los ordena
// al revés — medido de verdad el cian tiene L=0.3825 y el índigo L=0.1851, más
// del doble, y cada uno cae de un lado distinto de la frontera.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Las dos tintas candidatas. `hex` es para la cuenta, `css` es lo que se pinta.
 *  --color-on-accent vale #1a1f26 en LOS DOS bloques de tema a propósito (ver el
 *  comentario del token en globals.css), así que fijar su hex aquí no parte
 *  ningún tema; lo que se pinta sigue siendo la var, no el literal. */
export const TINTA_OSCURA = { hex: "#1a1f26", css: "var(--color-on-accent)" } as const;
export const TINTA_CLARA = { hex: "#ffffff", css: "#ffffff" } as const;

/** Canales 0-255 de un `#rgb` o `#rrggbb`. `null` si no es ninguna de las dos. */
function canales(hex: string): [number, number, number] | null {
  const m = hex.trim().match(HEX);
  if (!m) return null;
  const c = m[1].length === 3 ? m[1].replace(/./g, (d) => d + d) : m[1];
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
}

/** Canal sRGB 0-255 → lineal, tal cual lo define WCAG. */
function aLineal(canal: number): number {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Luminancia relativa (0 = negro, 1 = blanco).
 * Un hex ilegible cuenta como 0: es la hipótesis que deja ganar a la tinta
 * clara, o sea el comportamiento que la app tenía antes de calcular nada.
 */
export function luminanciaRelativa(hex: string): number {
  const rgb = canales(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(aLineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre dos colores opacos, de 1:1 a 21:1. */
export function contraste(hexA: string, hexB: string): number {
  const a = luminanciaRelativa(hexA);
  const b = luminanciaRelativa(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Aplana `relleno` pintado con opacidad `alfa` (0-1) sobre `fondo` y devuelve el
 * color resultante en #rrggbb. Hay que componer ANTES de medir: un relleno al
 * 80 % no es el color del relleno, y sobre una columna blanca aclara mientras
 * que sobre una oscura oscurece — el mismo naranja da L=0.4040 en tema claro y
 * L=0.2145 en tema oscuro.
 */
export function componerSobre(relleno: string, alfa: number, fondo: string): string | null {
  const f = canales(relleno);
  const b = canales(fondo);
  if (!f || !b) return null;
  const a = Math.min(1, Math.max(0, alfa));
  const mezcla = f.map((canal, i) => Math.round(a * canal + (1 - a) * b[i]));
  return `#${mezcla.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Tinta legible sobre `relleno` pintado al `alfa` indicado encima de `fondo`:
 * devuelve el valor CSS de la candidata que más contrasta con el color ya
 * compuesto. La frontera entre las dos cae en luminancia 0.208, que es donde
 * blanco y #1a1f26 empatan.
 *
 * OJO con el resto de umbrales: esto elige la MEJOR de dos tintas, no garantiza
 * 4.5:1. Un compuesto de luminancia intermedia (entre 0.183 y 0.235) no llega a
 * AA con ninguna de las dos, y en ese caso el arreglo no es la tinta sino el
 * relleno.
 */
export function tintaLegible(relleno: string, alfa: number, fondo: string): string {
  const compuesto = componerSobre(relleno, alfa, fondo) ?? fondo;
  return contraste(TINTA_CLARA.hex, compuesto) >= contraste(TINTA_OSCURA.hex, compuesto)
    ? TINTA_CLARA.css
    : TINTA_OSCURA.css;
}
