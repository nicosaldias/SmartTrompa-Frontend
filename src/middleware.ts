import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/reset-password"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!token && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }

  // If access token exists, try to verify it
  if (token) {
    try {
      const secret = Buffer.from(jwtSecret, "base64");
      const { payload } = await jwtVerify(token, new Uint8Array(secret));
      const sub = payload.sub as string;
      if (!sub) throw new Error("Token inválido");
      return NextResponse.next();
    } catch {
      // Access token invalid/expired — fall through to try refresh
    }
  }

  // Access token missing or expired — attempt refresh using refresh token
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/trabajador/refresh/`, {
        method: "POST",
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
      });

      if (refreshRes.ok) {
        // Extract new cookies from backend response
        const response = NextResponse.redirect(request.url);
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

        return response;
      }
    } catch {
      // Refresh failed — redirect to login
    }
  }

  // Both access and refresh failed
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  response.cookies.delete("st_user");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|reset-password).*)"],
};
