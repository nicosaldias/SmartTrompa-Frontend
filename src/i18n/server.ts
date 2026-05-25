import { cookies } from "next/headers";
import { COOKIE_NAME, DEFAULT_LANG, isLang, type Lang } from "./types";

export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return isLang(raw) ? raw : DEFAULT_LANG;
}
