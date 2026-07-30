import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const PUBLIC_PATHS = ["/login", "/reset-password"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE_URL && process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
  throw new Error("NEXT_PUBLIC_API_URL no está definida (requerida fuera de MOCK_MODE)");
}
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
// Dominio compartido entre subdominios (front rfs.* ↔ back udec.*). Vacío en local.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/**
 * Decide si el access token sigue vigente leyendo `exp` SIN verificar la firma.
 *
 * Este middleware es un guard de UX —decide a quién mandar a /login y cuándo
 * conviene refrescar—, no la frontera de seguridad. La autorización real la
 * aplica el backend, que verifica firma, expiración y roles en cada request.
 *
 * Verificar la firma acá exigiría tener el JWT_SECRET del backend dentro de este
 * contenedor. Ese es justamente el riesgo que se quiso eliminar: el frontend es
 * la superficie más expuesta, y con el secreto de firma un compromiso suyo
 * permitiría emitir tokens válidos de cualquier usuario, incluido Administrador.
 *
 * Consecuencia asumida: alguien puede fabricar una cookie con `exp` futuro y
 * llegar al layout del dashboard, pero cada llamada a la API le responderá 401,
 * así que no obtiene datos ni puede ejecutar acciones.
 */
function tieneSesionVigente(token: string): boolean {
  try {
    const { exp, sub } = decodeJwt(token);
    if (!sub) return false;
    return typeof exp === "number" && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function attemptRefresh(
  refreshToken: string,
  response: NextResponse
): Promise<boolean> {
  try {
    const refreshRes = await fetch(`${API_BASE_URL}/trabajador/refresh/`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });

    if (!refreshRes.ok) return false;

    const setCookies = refreshRes.headers.getSetCookie?.() ?? [];
    for (const cookieStr of setCookies) {
      const accessMatch = cookieStr.match(/accessToken=([^;]+)/);
      if (accessMatch) {
        response.cookies.set("accessToken", accessMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 8,
          path: "/",
          domain: COOKIE_DOMAIN,
        });
      }
      const refreshMatch = cookieStr.match(/refreshToken=([^;]+)/);
      if (refreshMatch) {
        response.cookies.set("refreshToken", refreshMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
          domain: COOKIE_DOMAIN,
        });
      }
    }
    return setCookies.length > 0;
  } catch {
    return false;
  }
}

function clearSessionAndRedirectToLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete({ name: "accessToken", path: "/", domain: COOKIE_DOMAIN });
  response.cookies.delete({ name: "refreshToken", path: "/", domain: COOKIE_DOMAIN });
  response.cookies.delete({ name: "st_user", path: "/", domain: COOKIE_DOMAIN });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // En modo mock, solo verificar presencia de cookie (sin JWT)
  if (MOCK_MODE) {
    const hasToken = request.cookies.has("accessToken");
    if (isPublicPath && hasToken) return NextResponse.redirect(new URL("/resumen", request.url));
    if (isPublicPath) return NextResponse.next();
    if (!hasToken) return clearSessionAndRedirectToLogin(request);
    return NextResponse.next();
  }

  const token = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  // Si estamos en /login y hay sesion vigente, redirigir al dashboard
  if (isPublicPath && token && tieneSesionVigente(token)) {
    return NextResponse.redirect(new URL("/resumen", request.url));
  }

  // Rutas publicas: dejar pasar
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Sin tokens: ir a login
  if (!token && !refreshToken) {
    return clearSessionAndRedirectToLogin(request);
  }

  // Access token vigente: seguir
  if (token && tieneSesionVigente(token)) {
    return NextResponse.next();
  }

  // Access token expirado o invalido — intentar refresh
  if (refreshToken) {
    const response = NextResponse.redirect(request.url);
    const refreshed = await attemptRefresh(refreshToken, response);
    if (refreshed) {
      return response;
    }
  }

  // Todo fallo — limpiar y al login
  return clearSessionAndRedirectToLogin(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|reset-password|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|css|js|map)$).*)",
  ],
};
