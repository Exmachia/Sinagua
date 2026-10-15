import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Las tarjetas para compartir leen sus fuentes con readFile: se incluyen explícitamente en las funciones del servidor.
  outputFileTracingIncludes: {
    "/opengraph-image": ["src/og/fuentes/**/*"],
    "/compartir/**": ["src/og/fuentes/**/*"],
  },
  partialPrefetching: true,
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
