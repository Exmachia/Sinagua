import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  poweredByHeader: false,
  // Las tarjetas para compartir leen sus fuentes con readFile: se incluyen explícitamente en las funciones del servidor.
  outputFileTracingIncludes: {
    "/opengraph-image": ["src/og/fuentes/**/*"],
    "/compartir/**": ["src/og/fuentes/**/*"],
    "/urgente/**": ["src/og/fuentes/**/*"],
  },
  partialPrefetching: true,
  // Encabezados de seguridad básicos: nadie puede meter el sitio en un iframe ajeno, el navegador no adivina tipos
  // de archivo y no se piden permisos de cámara, micrófono ni ubicación.
  // Los artículos se volvieron el muro de denuncias: los enlaces viejos no se rompen.
  async redirects() {
    return [
      { source: "/articulos", destination: "/denuncias", permanent: true },
      { source: "/articulos/:slug*", destination: "/denuncias", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
