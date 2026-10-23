import type { Metadata } from "next";
import Link from "next/link";
import NavFlotante from "@/components/landing/NavFlotante";
import { ARTICULOS } from "@/data/articulos";
import { fechaCorta } from "@/lib/presas";
import { CONTACTO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Artículos — Sinagua",
  description: "Lo que está pasando con el agua en México, caso por caso: hechos con fuente y los datos oficiales de cada lugar.",
  alternates: { canonical: "/articulos" },
};

export default function Articulos() {
  const lista = [...ARTICULOS].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <NavFlotante />
      <main className="mx-auto max-w-4xl px-4 pt-32 pb-24 sm:px-8 lg:pt-40">
        <p className="text-[14px] font-semibold text-critico">Artículos</p>
        <h1 className="mt-3 font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance">
          Lo que nos están contando
        </h1>
        <p className="mt-4 max-w-[56ch] text-[1.1rem] leading-relaxed text-ink-2">
          Casos que nos comparte la gente, con hechos verificables, sus fuentes y los datos oficiales de cada lugar.
        </p>
        <ul className="mt-12 grid gap-6">
          {lista.map((a) => (
            <li key={a.slug}>
              <Link href={`/articulos/${a.slug}`} className="group block rounded-2xl bg-surface p-6 ring-1 ring-black/5 transition-shadow hover:shadow-[0_10px_30px_rgba(25,23,20,0.10)] sm:p-7">
                <p className="text-[13px] font-semibold text-critico">{a.lugar} <span className="font-normal text-ink-3">· {fechaCorta(a.fecha)}</span></p>
                <h2 className="mt-2 font-serif text-[1.7rem] leading-tight font-semibold text-balance group-hover:underline group-hover:underline-offset-4">{a.titulo}</h2>
                <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-2">{a.entrada}</p>
                <p className="mt-4 text-[14px] font-semibold">Leer →</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-[15px] text-ink-2">
          ¿Conoces un caso que deba estar aquí?{" "}
          <a href={CONTACTO} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4 hover:text-critico">
            Escríbeme en LinkedIn
          </a>{" "}
          con la nota o el dato.
        </p>
      </main>
    </>
  );
}
