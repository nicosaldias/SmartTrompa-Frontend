import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useT, useLanguage } from "@/i18n/LanguageProvider";

function TraducidoSimple() {
  const t = useT();
  return <p data-testid="hola">{t("login.title")}</p>;
}

function ConToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="texto">{t("login.title")}</span>
      <button onClick={() => setLang(lang === "es" ? "en" : "es")}>toggle</button>
    </div>
  );
}

function ConInterpolacion() {
  const t = useT();
  return <p data-testid="count">{t("header.alertsActiveTitle", { count: 5 })}</p>;
}

describe("LanguageProvider", () => {
  it("renderiza traducciones del idioma inicial (es)", () => {
    render(
      <LanguageProvider initialLang="es">
        <TraducidoSimple />
      </LanguageProvider>
    );
    // El texto exacto puede variar pero al menos no debe ser la key cruda
    const node = screen.getByTestId("hola");
    expect(node.textContent).not.toBe("login.title");
    expect(node.textContent?.length).toBeGreaterThan(0);
  });

  it("cambia el idioma al llamar setLang", () => {
    render(
      <LanguageProvider initialLang="es">
        <ConToggle />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("es");
    const textoEs = screen.getByTestId("texto").textContent;

    act(() => {
      screen.getByText("toggle").click();
    });

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("texto").textContent).not.toBe(textoEs);
  });

  it("interpola parámetros tipo {count}", () => {
    render(
      <LanguageProvider initialLang="es">
        <ConInterpolacion />
      </LanguageProvider>
    );
    const txt = screen.getByTestId("count").textContent ?? "";
    expect(txt).toContain("5");
    // El template original con {count} no debe quedar visible
    expect(txt).not.toContain("{count}");
  });

  it("lanza error si useLanguage se usa fuera del provider", () => {
    function Outside() {
      useLanguage();
      return null;
    }
    expect(() => render(<Outside />)).toThrow(/LanguageProvider/);
  });
});
