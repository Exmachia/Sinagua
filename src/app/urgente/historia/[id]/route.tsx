import { ImageResponse } from "next/og";
import { alerta, alertas } from "@/lib/urgente";
import { Historia, TAMANO_HISTORIA } from "@/og/historia";
import { fuentes } from "@/og/tarjeta";

// Una imagen por alerta, generada al compilar (las alertas cambian solo con cada actualización de datos).
export function generateStaticParams() {
  return alertas().map((a) => ({ id: a.id }));
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = alerta(id);
  if (!a) return new Response("No encontrado", { status: 404 });
  return new ImageResponse(<Historia a={a} />, { ...TAMANO_HISTORIA, fonts: await fuentes() });
}
