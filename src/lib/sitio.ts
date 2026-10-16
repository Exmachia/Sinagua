/** URL pública del sitio. En producción es el dominio propio; en vistas previas de Vercel y en local, la que toque. */
export const SITIO =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production"
    ? "https://www.sinagua.org"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3100");

/** Para quien tenga datos, sepa del tema o quiera ayudar. */
export const CONTACTO = "https://www.linkedin.com/in/eduardo-chacon-171367275/";
