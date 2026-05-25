import { describe, it, expect, beforeEach } from "vitest";
import { getUserFromCookie } from "@/utils/cookies";

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    writable: true,
    configurable: true,
    value,
  });
}

describe("getUserFromCookie", () => {
  beforeEach(() => {
    setCookie("");
  });

  it("retorna null si no existe la cookie st_user", () => {
    setCookie("otra=valor; lang=es");
    expect(getUserFromCookie()).toBeNull();
  });

  it("parsea correctamente un usuario válido", () => {
    const user = { nombre: "Juan", cargo: "Administrador", rut: "12345678-9" };
    setCookie(`st_user=${encodeURIComponent(JSON.stringify(user))}`);
    expect(getUserFromCookie()).toEqual(user);
  });

  it("retorna null si el JSON es inválido", () => {
    setCookie("st_user=no-es-json");
    expect(getUserFromCookie()).toBeNull();
  });

  it("convive con otras cookies sin confundirse", () => {
    const user = { nombre: "Ana" };
    setCookie(
      `lang=es; st_user=${encodeURIComponent(JSON.stringify(user))}; theme=dark`
    );
    expect(getUserFromCookie()).toEqual(user);
  });
});
