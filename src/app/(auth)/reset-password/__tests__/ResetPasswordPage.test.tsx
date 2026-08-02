import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import ResetPasswordPage from "../page";

const { resetMock, searchParams } = vi.hoisted(() => ({
  resetMock: vi.fn(),
  searchParams: { token: "tok-123" as string | null },
}));

vi.mock("@/actions/auth", () => ({
  resetPasswordAction: resetMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? searchParams.token : null),
  }),
}));

function renderPage() {
  return render(
    <LanguageProvider initialLang="es">
      <ResetPasswordPage />
    </LanguageProvider>
  );
}

beforeEach(() => {
  resetMock.mockReset();
  searchParams.token = "tok-123";
});

describe("ResetPasswordPage - recuperación de contraseña end-to-end", () => {
  it("valida la política antes de llamar a la action", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 12 caracteres/), {
      target: { value: "corta1" },
    });
    // Ambos campos llenos: `required` no bloquea el submit y valida la política.
    const inputs = screen.getAllByDisplayValue("");
    fireEvent.change(inputs[inputs.length - 1], { target: { value: "corta1" } });
    fireEvent.click(screen.getByText("GUARDAR CONTRASEÑA"));

    await waitFor(() =>
      expect(
        screen.getByText(/entre 12 y 72 caracteres e incluir letras y números/)
      ).toBeTruthy()
    );
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("con token y contraseñas válidas llama a la action y muestra el éxito", async () => {
    resetMock.mockResolvedValue({ success: true });
    renderPage();

    const inputs = screen.getAllByDisplayValue("");
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 12 caracteres/), {
      target: { value: "clave-segura-99" },
    });
    // El segundo password es el de confirmación.
    fireEvent.change(inputs[inputs.length - 1], { target: { value: "clave-segura-99" } });
    fireEvent.click(screen.getByText("GUARDAR CONTRASEÑA"));

    await waitFor(() =>
      expect(screen.getByText("Contraseña actualizada. Ya puedes iniciar sesión.")).toBeTruthy()
    );
    expect(resetMock).toHaveBeenCalledWith("tok-123", "clave-segura-99");
  });

  it("sin token muestra el aviso y deshabilita el envío", () => {
    searchParams.token = null;
    renderPage();

    expect(screen.getByText(/El enlace no es válido o está incompleto/)).toBeTruthy();
    expect((screen.getByText("GUARDAR CONTRASEÑA") as HTMLButtonElement).disabled).toBe(true);
  });
});
