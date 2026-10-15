import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Marca from "@/components/Marca";
import { EJEMPLOS, tarjeta } from "@/og/datos";
import Redirigir from "./Redirigir";

/*
 * Enlace para compartir una ficha: /compartir/acuifero/1113, /compartir/presa/LDCJL…
 * Las fichas del mapa viven en el "#" de la URL, que nunca llega al servidor; esta página sí, así que las redes
 * sociales pueden leer su título y su imagen. Quien da clic llega a la ficha en el mapa.
 */

type Props = { params: Promise<{ tipo: string; clave: string }> };

export function generateStaticParams() {
  return EJEMPLOS;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo, clave } = await params;
  const t = tarjeta(tipo, decodeURIComponent(clave));
  if (!t) return {};
  const titulo = `${t.titulo}: ${t.cifra} ${t.cifraTexto} — Sinagua`;
  return {
    title: titulo,
    description: t.descripcion,
    // Página puente para redes sociales: no debe aparecer en buscadores (la ficha vive en el mapa).
    robots: { index: false, follow: true },
    openGraph: { title: titulo, description: t.descripcion, type: "article", siteName: "Sinagua", locale: "es_MX" },
    twitter: { card: "summary_large_image", title: titulo, description: t.descripcion },
  };
}

export default async function Compartir({ params }: Props) {
  const { tipo, clave } = await params;
  const t = tarjeta(tipo, decodeURIComponent(clave));
  if (!t) notFound();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <Redirigir destino={t.destino} />
      <Marca className="text-2xl" />
      <p className="mt-10 text-[14px] font-semibold text-critico">{t.sobre}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight font-semibold">{t.titulo}</h1>
      <p className="mt-6 font-serif text-5xl font-semibold">{t.cifra}</p>
      <p className="mt-1 text-ink-2">{t.cifraTexto}</p>
      {t.frase && <p className="mt-4 text-ink-2">{t.frase}</p>}
      <Link href={t.destino} className="mt-10 inline-flex min-h-12 w-fit items-center rounded-full bg-ink px-6 font-semibold text-white">
        {t.boton ?? "Ver en el mapa"}
      </Link>
    </main>
  );
}
