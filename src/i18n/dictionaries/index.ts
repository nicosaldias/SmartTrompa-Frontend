import es from "./es.json";
import en from "./en.json";
import type { Dictionary, Lang } from "../types";

export const dictionaries: Record<Lang, Dictionary> = {
  es: es as Dictionary,
  en: en as Dictionary,
};
