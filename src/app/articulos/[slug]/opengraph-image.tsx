import { ImageResponse } from "next/og";
import { ARTICULOS } from "@/data/articulos";
import { fuentes, TAMANO, TarjetaFicha } from "@/og/tarjeta";

export const alt = "Artículo de Sinagua";
export const size = TAMANO;
export const contentType = "image/png";

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICULOS.find((x) => x.slug === slug);
  if (!a) return new Response("No encontrado", { status: 404 });
  return new ImageResponse(
    <TarjetaFicha t={{ sobre: `Artículo · ${a.lugar}`, titulo: a.titulo, cifra: "", cifraTexto: "", frase: a.entrada, destino: `/articulos/${a.slug}`, descripcion: a.entrada }} />,
    { ...TAMANO, fonts: await fuentes() },
  );
}
