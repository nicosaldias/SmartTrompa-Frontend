"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { trabajadorEndpoints } from "@/api/endpoints";
import { MOCK_TRABAJADORES } from "@/api/mock-data";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
// Dominio compartido entre subdominios (front rfs.* ↔ back udec.*). Vacío en local.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export async function loginAction(rut: string, password: string) {
  if (MOCK_MODE) {
    const mockUser = MOCK_TRABAJADORES.find(t => t.rut === rut) || MOCK_TRABAJADORES[0];
    const cookieStore = await cookies();
    cookieStore.set("accessToken", "mock-access-token", {
      httpOnly: true, secure: false, maxAge: 60 * 60 * 24, path: "/",
    });
    cookieStore.set("refreshToken", "mock-refresh-token", {
      httpOnly: true, secure: false, maxAge: 60 * 60 * 24 * 7, path: "/",
    });
    cookieStore.set("st_user", JSON.stringify({
      rut: mockUser.rut, nombre: mockUser.nombre,
      apellidoPaterno: mockUser.apellidoPaterno, cargo: mockUser.cargo,
    }), { path: "/", maxAge: 60 * 60 * 24 * 7 });
    return { success: true, cargo: mockUser.cargo };
  }

  // Limpiar cookies residuales antes de intentar login
  const cookieStorePre = await cookies();
  cookieStorePre.delete({ name: "accessToken", path: "/", domain: COOKIE_DOMAIN });
  cookieStorePre.delete({ name: "refreshToken", path: "/", domain: COOKIE_DOMAIN });
  cookieStorePre.delete({ name: "st_user", path: "/", domain: COOKIE_DOMAIN });

  let res: Response;
  try {
    res = await fetch(trabajadorEndpoints.login(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rut, password }),
    });
  } catch (err) {
    console.error("[LOGIN] Network error:", err);
    return { error: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo." };
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || error.error || "RUT o contraseña incorrectos" };
  }

  // Backend returns Trabajador object and sets accessToken cookie via Set-Cookie header
  const data = await res.json();

  const cookieStore = await cookies();

  // Extract accessToken and refreshToken from Set-Cookie headers
  const allSetCookies = res.headers.getSetCookie?.() ?? [];

  for (const cookieStr of allSetCookies) {
    const accessMatch = cookieStr.match(/accessToken=([^;]+)/);
    if (accessMatch) {
      cookieStore.set("accessToken", accessMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8,
        path: "/",
        domain: COOKIE_DOMAIN,
      });
    }

    const refreshMatch = cookieStr.match(/refreshToken=([^;]+)/);
    if (refreshMatch) {
      cookieStore.set("refreshToken", refreshMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        domain: COOKIE_DOMAIN,
      });
    }
  }

  // Fallback: if getSetCookie not available, try get("set-cookie")
  if (allSetCookies.length === 0) {
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      const accessMatch = setCookieHeader.match(/accessToken=([^;]+)/);
      if (accessMatch) {
        cookieStore.set("accessToken", accessMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 8,
          path: "/",
        });
      }
      const refreshMatch = setCookieHeader.match(/refreshToken=([^;]+)/);
      if (refreshMatch) {
        cookieStore.set("refreshToken", refreshMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }
    }
  }

  // Store user info in a readable cookie for UI display
  cookieStore.set(
    "st_user",
    JSON.stringify({
      rut: data.rut,
      nombre: data.nombre,
      apellidoPaterno: data.apellidoPaterno,
      cargo: data.cargo,
    }),
    { path: "/", maxAge: 60 * 60 * 24 * 7, domain: COOKIE_DOMAIN }
  );

  return { success: true, cargo: data.cargo };
}

export async function logoutAction() {
  if (!MOCK_MODE) {
    // Call backend logout to invalidate cookies and revoke refresh token
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("accessToken")?.value;
      const refreshToken = cookieStore.get("refreshToken")?.value;
      const cookieParts = [
        accessToken ? `accessToken=${accessToken}` : "",
        refreshToken ? `refreshToken=${refreshToken}` : "",
      ].filter(Boolean).join("; ");

      await fetch(trabajadorEndpoints.logout(), {
        headers: cookieParts ? { Cookie: cookieParts } : {},
      });
    } catch {
      // Ignore network errors on logout
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete({ name: "accessToken", path: "/", domain: COOKIE_DOMAIN });
  cookieStore.delete({ name: "refreshToken", path: "/", domain: COOKIE_DOMAIN });
  cookieStore.delete({ name: "st_user", path: "/", domain: COOKIE_DOMAIN });
  redirect("/login");
}

export async function forgotPasswordAction(correo: string) {
  if (MOCK_MODE) return { success: true };

  const res = await fetch(trabajadorEndpoints.forgotPassword(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Error al enviar el correo" };
  }

  return { success: true };
}

export async function resetPasswordAction(token: string, nuevaPassword: string) {
  if (MOCK_MODE) return { success: true };

  const res = await fetch(trabajadorEndpoints.resetPassword(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, nuevaPassword }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Error al restablecer la contraseña" };
  }

  return { success: true };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("st_user")?.value;
  if (!userCookie) return null;
  try {
    return JSON.parse(userCookie);
  } catch {
    return null;
  }
}

export async function getCookieHeader() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const parts = [
    accessToken ? `accessToken=${accessToken}` : "",
    refreshToken ? `refreshToken=${refreshToken}` : "",
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join("; ");
}

export async function refreshTokensAction() {
  if (MOCK_MODE) return { success: true };

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  if (!refreshToken) return { error: "No hay refresh token" };

  const res = await fetch(trabajadorEndpoints.refresh(), {
    method: "POST",
    headers: {
      Cookie: `refreshToken=${refreshToken}`,
    },
  });

  if (!res.ok) {
    // Refresh failed — clear cookies
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("st_user");
    return { error: "Sesión expirada" };
  }

  // Extract new cookies from response
  const allCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookieStr of allCookies) {
    const accessMatch = cookieStr.match(/accessToken=([^;]+)/);
    if (accessMatch) {
      cookieStore.set("accessToken", accessMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8,
        path: "/",
        domain: COOKIE_DOMAIN,
      });
    }

    const refreshMatch = cookieStr.match(/refreshToken=([^;]+)/);
    if (refreshMatch) {
      cookieStore.set("refreshToken", refreshMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        domain: COOKIE_DOMAIN,
      });
    }
  }

  return { success: true };
}
