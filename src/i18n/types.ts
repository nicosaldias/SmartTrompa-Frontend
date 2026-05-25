import esDict from "./dictionaries/es.json";

export type Lang = "es" | "en";

export const LANGS: Lang[] = ["es", "en"];

export const DEFAULT_LANG: Lang = "es";

export const COOKIE_NAME = "st_lang";

export type Dictionary = typeof esDict;

type Primitive = string | number | boolean | null;

type DotNestedKeys<T> = T extends Primitive
  ? ""
  : {
      [K in keyof T & (string | number)]: T[K] extends Primitive
        ? `${K}`
        : `${K}` | `${K}.${DotNestedKeys<T[K]>}`;
    }[keyof T & (string | number)];

export type TranslationKey = DotNestedKeys<Dictionary>;

export function isLang(value: unknown): value is Lang {
  return value === "es" || value === "en";
}
