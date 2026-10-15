import { ImageResponse } from "next/og";
import { alerta } from "@/lib/urgente";
import { Historia, TAMANO_HISTORIA } from "@/og/historia";
import { fuentes } from "@/og/tarjeta";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = alerta(id, new Date()); // si sus datos ya no están vigentes, no hay imagen
  if (!a) return new Response("No encontrado", { status: 404 });
  return new ImageResponse(<Historia a={a} />, { ...TAMANO_HISTORIA, fonts: await fuentes() });
}
