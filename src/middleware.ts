import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/reset-password"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const key = new Uint8Array(Buffer.from(secret, "base64"));
    const { payload } = await jwtVerify(token, key);
    return !!payload.sub;
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
          maxAge: 60 * 15,
          path: "/",
        });
      }
      const refreshMatch = cookieStr.match(/refreshToken=([^;]+)/);
      if (refreshMatch) {
        response.cookies.set("refreshToken", refreshMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
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
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  response.cookies.delete("st_user");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const jwtSecret = process.env.JWT_SECRET;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Si estamos en /login y hay sesion valida, redirigir al dashboard
  if (isPublicPath && token && jwtSecret) {
    const isValid = await verifyToken(token, jwtSecret);
    if (isValid) {
      return NextResponse.redirect(new URL("/resumen", request.url));
    }
  }

  // Rutas publicas: dejar pasar
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Sin tokens: ir a login
  if (!token && !refreshToken) {
    return clearSessionAndRedirectToLogin(request);
  }

  // Sin secret JWT: no podemos verificar, limpiar todo
  if (!jwtSecret) {
    return clearSessionAndRedirectToLogin(request);
  }

  // Verificar access token
  if (token) {
    const isValid = await verifyToken(token, jwtSecret);
    if (isValid) {
      return NextResponse.next();
    }
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|reset-password).*)"],
};
