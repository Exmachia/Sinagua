import { ImageResponse } from "next/og";
import { EJEMPLOS, tarjeta } from "@/og/datos";
import { fuentes, TAMANO, TarjetaFicha } from "@/og/tarjeta";

export const alt = "Ficha de Sinagua";
export const size = TAMANO;
export const contentType = "image/png";

export function generateStaticParams() {
  return EJEMPLOS;
}

export default async function Imagen({ params }: { params: Promise<{ tipo: string; clave: string }> }) {
  const { tipo, clave } = await params;
  const t = tarjeta(tipo, decodeURIComponent(clave));
  if (!t) return new Response("No encontrado", { status: 404 });
  return new ImageResponse(<TarjetaFicha t={t} />, { ...TAMANO, fonts: await fuentes() });
}
