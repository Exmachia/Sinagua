import type { Metadata, Viewport } from "next";
import { SITIO } from "@/lib/sitio";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

// Titulares: serif de periódico con tamaño óptico (se afina sola en tamaños grandes).
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

// Texto e interfaz: grotesca diseñada para un medio periodístico.
const sans = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});


export const metadata: Metadata = {
  // URL absoluta del sitio (las redes sociales necesitan rutas completas para las imágenes).
  metadataBase: new URL(SITIO),
  twitter: { card: "summary_large_image" },
  title: "Sinagua — México se está quedando sin agua",
  description:
    "4 de cada 10 mexicanos viven donde el agua escasea, y a cada persona le toca 28% menos agua que en 1998. Busca tu municipio y mira cómo está el agua donde vives.",
  openGraph: {
    title: "Sinagua — México se está quedando sin agua",
    siteName: "Sinagua",
    description: "México se está quedando sin agua: sequía, presas y acuíferos, con datos oficiales. ¿Cómo está tu municipio?",
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
