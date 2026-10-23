import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavFlotante from "@/components/landing/NavFlotante";
import { BotonCompartir } from "@/components/ui";
import { ARTICULOS } from "@/data/articulos";
import { datoOficial } from "@/lib/articulos";
import { fechaCorta } from "@/lib/presas";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICULOS.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.titulo} — Sinagua`,
    description: a.entrada,
    alternates: { canonical: `/articulos/${a.slug}` },
    openGraph: { title: a.titulo, description: a.entrada, type: "article", siteName: "Sinagua", locale: "es_MX" },
    twitter: { card: "summary_large_image", title: a.titulo, description: a.entrada },
  };
}

export default async function Articulo({ params }: Props) {
  const { slug } = await params;
  const a = ARTICULOS.find((x) => x.slug === slug);
  if (!a) notFound();
  const datos = a.datos.map(datoOficial).filter((d) => d !== null);
  return (
    <>
      <NavFlotante />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-8 lg:pt-40">
        <Link href="/articulos" className="text-[14px] text-ink-3 hover:text-ink">← Artículos</Link>
        <p className="mt-6 text-[14px] font-semibold text-critico">{a.lugar} <span className="font-normal text-ink-3">· {fechaCorta(a.fecha)}</span></p>
        <h1 className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.2rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance">{a.titulo}</h1>
        <p className="mt-5 text-[1.15rem] leading-relaxed text-ink-2">{a.entrada}</p>
        <div className="mt-6">
          <BotonCompartir ruta={`/articulos/${a.slug}`} titulo={a.titulo} texto={`${a.titulo}. ${a.entrada}`} />
        </div>

        <ul className="mt-10 space-y-4">
          {a.puntos.map((p) => (
            <li key={p} className="flex gap-3 text-[1.05rem] leading-relaxed">
              <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-critico" />
              {p}
            </li>
          ))}
        </ul>

        {datos.length > 0 && (
          <section aria-label="Datos oficiales" className="mt-12 rounded-2xl bg-surface p-6 ring-1 ring-black/5 sm:p-7">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Lo que dicen los datos oficiales</h2>
            <dl className="mt-4 space-y-5">
              {datos.map((d) => (
                <div key={d.texto}>
                  <dt className="flex items-center gap-2 font-serif text-[1.5rem] leading-tight font-semibold">
                    {d.color && <span aria-hidden className="size-3 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: d.color }} />}
                    {d.valor}
                  </dt>
                  <dd className="mt-1 text-ink-2">{d.texto} <span className="text-[13px] text-ink-3">({d.fuente})</span></dd>
                </div>
              ))}
            </dl>
            <Link href={a.mapa} className="mt-6 inline-block text-[14px] font-semibold underline underline-offset-4 hover:text-critico">
              Verlo en el mapa →
            </Link>
          </section>
        )}

        <section aria-label="Fuentes" className="mt-10">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Fuentes</h2>
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {a.fuentes.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-critico">{f.nombre}</a>
              </li>
            ))}
          </ul>
        </section>

      </main>
    </>
  );
}
