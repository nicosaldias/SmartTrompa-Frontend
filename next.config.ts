import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  output: "standalone",
  // JWT_SECRET NO se declara aquí: el bloque `env:` lo inyectaría en bundles cliente.
  // El middleware (Edge runtime) lo lee via process.env.JWT_SECRET sin necesidad de exponerlo.
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
        ],
      },
    ];
  },
};

export default nextConfig;
