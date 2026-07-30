import type { NextConfig } from "next";
import pkg from "./package.json";

/**
 * Image remote patterns leídos desde NEXT_PUBLIC_API_URL en build time.
 * Permite servir uploads del backend (`/uploads/**`) sin hardcodear dominios.
 * Si NEXT_PUBLIC_API_URL no está seteado, falla el build (intencional en prod).
 */
function imageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    // En `next lint` / `tsc --noEmit` la var puede no estar; devolvemos lista vacía.
    return [];
  }
  const url = new URL(apiUrl);
  const protocol = url.protocol.replace(":", "") as "http" | "https";
  return [
    {
      protocol,
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/uploads/**",
    },
  ];
}

/**
 * CSP pensada para no romper la app.
 *
 * `script-src` lleva 'unsafe-inline' porque Next inyecta los scripts de arranque
 * e hidratacion sin nonce; quitarlo exige middleware con nonce por request y
 * romperia el render estatico. 'unsafe-eval' solo en desarrollo (lo pide el
 * refresh de Turbopack), nunca en el bundle de produccion.
 *
 * El valor real de esta politica esta en las directivas que SI son estrictas:
 * `frame-ancestors`, `base-uri`, `form-action` y `connect-src`, que acotan a
 * donde puede hablar la app aunque se logre inyectar un script.
 */
function contentSecurityPolicy(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // Solo el origen: la ruta (/api) no aplica en connect-src.
  const apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
  // El canal en vivo (STOMP en /ws) es el mismo backend con esquema ws/wss.
  // Se declara explicito: no todos los navegadores aceptan el upgrade
  // implicito https->wss al matchear sources.
  const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, "ws") : "";
  const isDev = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:" + (apiOrigin ? ` ${apiOrigin}` : ""),
    "font-src 'self' data:",
    // ApexCharts puede instanciar workers desde blob:; sin esto caerian en
    // default-src y los graficos dejarian de renderizar.
    "worker-src 'self' blob:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}${wsOrigin ? ` ${wsOrigin}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  output: "standalone",
  // El frontend ya no recibe JWT_SECRET en ninguna forma: el middleware no verifica
  // la firma del token (eso lo hace el backend en cada request), así que un
  // compromiso del front no habilita forjar sesiones. Ver src/middleware.ts.
  // Solo exponemos el número de versión (público, tomado de package.json) para mostrarlo en el login.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // 1 año. Sin `preload`: entrar a la lista de precarga es practicamente
          // irreversible y afecta a todo el dominio raiz, no solo a esta app.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        ],
      },
    ];
  },
};

export default nextConfig;
