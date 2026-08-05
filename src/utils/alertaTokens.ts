// Tokens de color semántico de alertas — fuente única para TODAS las vistas.
// Antes cada vista declaraba su propio TIPO_COLORS/NIVEL_COLORS (o un switch
// con hexes sueltos) y el mismo tipo cambiaba de color entre pantallas.

import type { TipoAlerta, NivelAlerta } from "@/types";

export const TIPO_COLORS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "#ef4444",     // rojo — riesgo fisiológico directo
  AJUSTE: "#f97316",           // naranja
  FILTRO: "#eab308",           // amarillo — saturación instantánea
  FILTRO_VIDA_UTIL: "#8b5cf6", // violeta — desgaste acumulado (job)
  BATERIA: "#3b82f6",          // azul
  DESCONEXION: "#6b7280",      // gris — pérdida de señal, no medición
};

export const NIVEL_COLORS: Record<NivelAlerta, string> = {
  OK: "#22c55e",
  ALERTA: "#f59e0b",
  CRITICO: "#ef4444",
};

export function nivelColor(nivel: NivelAlerta): string {
  return NIVEL_COLORS[nivel] ?? "#6b7280";
}

export function tipoColor(tipo: TipoAlerta): string {
  return TIPO_COLORS[tipo] ?? "#6b7280";
}

// Variante de TINTA (texto e íconos) de TIPO_COLORS. El mapa de arriba se usa
// como RELLENO —punto, borderTop, fondo tintado— y ahí el color de marca está
// bien; el problema es que el MISMO valor viajaba por indirección hasta pintar
// texto: ResumenClient.tsx:243 lo mete en `const color` y de ahí salían el ícono
// de 20px (:269), la etiqueta en versalitas (:280) y el contador (:291), y
// AlertaDetalleClient.tsx lo toma vía tipoBadgeColor() para el `color:` del
// badge (:241). Medido sobre .card blanco el 2026-08-04, contra el 4.5:1 de AA:
// AJUSTE #f97316 2.80:1, FILTRO #eab308 1.92:1, RESPIRATORIA #ef4444 3.76:1 y
// BATERIA #3b82f6 3.68:1. DESCONEXION #6b7280 es el caso simétrico: aprueba en
// claro (4.83:1) pero falla en OSCURO sobre .card #1c2333 (3.25:1), así que
// también entra. Los tokens traen el valor por tema y se movieron LOS DOS, no
// sólo el claro. Sobre .card, con el globals.css vigente:
//   claro   — RESPIRATORIA #b91c1c 6.47:1, AJUSTE #c2410c 5.18:1,
//             FILTRO #8a5c00 5.81:1, BATERIA #0b5ed7 5.84:1,
//             FILTRO_VIDA_UTIL #6d28d9 7.10:1, DESCONEXION #57606a 6.39:1.
//   oscuro  — RESPIRATORIA #f87171 5.68:1, AJUSTE #f97316 5.60:1,
//             FILTRO #eab308 8.19:1, BATERIA #60a5fa 6.18:1,
//             FILTRO_VIDA_UTIL #a78bfa 5.77:1, DESCONEXION #8b949e 5.10:1.
// El peor fondo NO es .card: es la fila de tabla con :hover (`table tbody
// tr:hover`, 3 % de acento), que en oscuro es peor dentro de .card y en claro
// sobre el fondo de página. Allí los seis quedan entre 4.94:1 y 7.92:1 en oscuro
// y entre 4.64:1 y 6.37:1 en claro, o sea que ninguno se cae.
// (Este comentario afirmaba antes que en oscuro los tokens valían el hex de
// marca —#ef4444, #3b82f6— y que "ese tema no cambia nada": es falso. El rojo y
// el azul oscuros se aclararon a red-400/blue-400 justo porque #ef4444 y
// #3b82f6 tampoco llegaban a AA sobre .card oscuro. También quedaron obsoletas
// las cifras del bloque claro: el 5.36:1 del rojo era del #cf222e anterior, el
// 5.19:1 del azul era del #0969da y el 4.87:1 del amarillo era del #9a6700; hoy
// son #b91c1c 6.47:1, #0b5ed7 5.84:1 y #8a5c00 5.81:1.)
// OJO al usarlo: estos valores son var(...), NO hexes, así que no se pueden
// concatenar como `${color}22` para tintar fondos ni bordes — para eso sigue
// estando TIPO_COLORS, que además es donde el naranja de marca debe quedarse.
export const TIPO_TEXT_COLORS: Record<TipoAlerta, string> = {
  RESPIRATORIA: "var(--color-red)",
  AJUSTE: "var(--color-accent-text)",
  FILTRO: "var(--color-yellow)",
  // Era el único en hex suelto y ya no lo es. El diagnóstico de entonces se
  // sostiene: NO existe un hex único válido para los dos temas, porque pasar
  // 4.5:1 sobre .card blanco exige luminancia ≤0.183 y sobre .card oscuro
  // #1c2333 exige ≥0.251 — intervalo vacío. El #8b5cf6 que estaba aquí fallaba
  // en AMBOS: 4.23:1 en claro y 3.71:1 en oscuro. Lo que faltaba era el par de
  // tokens, y ya está en globals.css: --color-violet #6d28d9 en claro (7.10:1
  // sobre .card) y #a78bfa en oscuro (5.77:1).
  // La alternativa —colapsarlo a --color-blue— se descarta igual que antes:
  // dejaría FILTRO_VIDA_UTIL indistinguible de BATERIA en la misma fila de seis
  // tarjetas (ResumenClient.tsx:112-119), donde el color ES la señal de tipo.
  // El violeta de RELLENO sigue siendo #8b5cf6 arriba en TIPO_COLORS: ahí pinta
  // punto y fondo tintado, no texto, y el color de marca se queda.
  FILTRO_VIDA_UTIL: "var(--color-violet)",
  BATERIA: "var(--color-blue)",
  // El gris de "sin señal" ES el gris de texto secundario de la paleta, así que
  // el token no le cambia el significado y además arregla el tema oscuro:
  // 6.39:1 en claro (#57606a) y 5.10:1 en oscuro (#8b949e) sobre .card.
  DESCONEXION: "var(--color-text-secondary)",
};

export function tipoTextColor(tipo: TipoAlerta): string {
  return TIPO_TEXT_COLORS[tipo] ?? "var(--color-text-secondary)";
}
