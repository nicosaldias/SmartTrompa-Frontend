import type { TranslationKey } from "@/i18n/types";

/**
 * Valores crudos del formulario de umbrales (strings, tal como vienen de los inputs).
 * Lo comparten el formulario individual y el masivo.
 */
export interface ValoresUmbral {
  alrtRespAlto: string;
  alrtRespBajo: string;
  alrtFiltrAlto: string;
  alrtFiltrBajo: string;
  alrtBateAlto: string;
  alrtBateMedio: string;
  alrtBateBajo: string;
}

export type ClaveErrorUmbral = Extract<
  TranslationKey,
  | "umbrales.validation.filtroOrder"
  | "umbrales.validation.respOrder"
  | "umbrales.validation.bateAltoOrder"
  | "umbrales.validation.bateMedioOrder"
>;

function aNumero(valor: string): number | null {
  return valor ? Number(valor) : null;
}

/**
 * Verifica el orden entre umbrales relacionados. Devuelve las claves i18n de los
 * errores encontrados (vacio = valido). Los campos sin valor no se validan.
 *
 * Bateria: alto/medio/bajo nombran la GRAVEDAD de la alerta, no el nivel de carga,
 * por eso los porcentajes van al reves del nombre: alto (10%) < medio (20%) < bajo (30%).
 */
export function validarOrdenUmbrales(valores: ValoresUmbral): ClaveErrorUmbral[] {
  const errores: ClaveErrorUmbral[] = [];
  const filtrAlto = aNumero(valores.alrtFiltrAlto);
  const filtrBajo = aNumero(valores.alrtFiltrBajo);
  const respAlto = aNumero(valores.alrtRespAlto);
  const respBajo = aNumero(valores.alrtRespBajo);
  const bateAlto = aNumero(valores.alrtBateAlto);
  const bateMedio = aNumero(valores.alrtBateMedio);
  const bateBajo = aNumero(valores.alrtBateBajo);

  if (filtrAlto != null && filtrBajo != null && filtrAlto <= filtrBajo) {
    errores.push("umbrales.validation.filtroOrder");
  }
  if (respBajo != null && respAlto != null && respBajo >= respAlto) {
    errores.push("umbrales.validation.respOrder");
  }
  if (bateAlto != null && bateMedio != null && bateAlto >= bateMedio) {
    errores.push("umbrales.validation.bateAltoOrder");
  }
  if (bateMedio != null && bateBajo != null && bateMedio >= bateBajo) {
    errores.push("umbrales.validation.bateMedioOrder");
  }

  return errores;
}
