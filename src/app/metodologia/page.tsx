import type { Metadata } from "next";
import Link from "next/link";
import Marca from "@/components/Marca";
import agua from "@/data/agua.json";
import calidad from "@/data/calidad.json";
import presasResumen from "@/data/presas_resumen.json";
import resumen from "@/data/resumen.json";
import usos from "@/data/usos.json";
import { ESTATUS, ORDEN } from "@/lib/acuiferos";
import { fechaCorta, NIVELES } from "@/lib/presas";
import { CATEGORIAS } from "@/lib/sequia";
import { CONTACTO } from "@/lib/sitio";
import { GRUPOS_USO, SEMAFORO, USO } from "@/lib/usos";

export const metadata: Metadata = {
  title: "Cómo se mide — Sinagua",
  description: "De dónde sale cada dato de Sinagua, qué significan los colores y cada cuánto se actualiza.",
  alternates: { canonical: "/metodologia" },
};

type Color = { color: string; label: string; nota?: string };
type Tema = {
  id: string;
  titulo: string;
  muestra: string;
  colores?: Color[];
  fuente: string;
  cada: string;
  dato: string;
  enlace?: { href: string; texto: string };
};

const temas: Tema[] = [
  {
    id: "sequia",
    titulo: "Sequía",
    muestra: "Qué tan seco está cada municipio. Contamos como “en sequía” de moderada para arriba.",
    colores: [...CATEGORIAS].reverse().map((c) => ({ color: c.color, label: c.label })),
    fuente: "Monitor de Sequía de México (Servicio Meteorológico Nacional, CONAGUA). Población: Censo 2020 (INEGI).",
    cada: "Cada quincena. Se descarga sola lunes y jueves.",
    dato: `Al ${fechaCorta(agua.sequia.actual.f)}`,
    enlace: { href: "/sequia", texto: "Ver el mapa de sequía" },
  },
  {
    id: "presas",
    titulo: "Presas",
    muestra: "Qué tan llenas están las ~210 presas principales, comparado con lo normal para la época del año.",
    colores: [...NIVELES].reverse().map((n) => ({ color: n.color, label: n.label })),
    fuente: "CONAGUA: Sistema Nacional de Información del Agua (1991–2025) y Sistema de Información Hidrológica (diario).",
    cada: "Diario en la fuente; aquí, un corte por semana. Se descarga solo lunes y jueves.",
    dato: `Al ${fechaCorta(presasResumen.ultima)}`,
    enlace: { href: "/presas", texto: "Ver el mapa de presas" },
  },
  {
    id: "acuiferos",
    titulo: "Acuíferos (agua bajo tierra)",
    muestra: "Cuánta agua se permite sacar de cada acuífero comparada con la que le entra cada año.",
    colores: ORDEN.map((k) => ({ color: ESTATUS[k].color, label: ESTATUS[k].label, nota: ESTATUS[k].desc })),
    fuente: "CONAGUA, disponibilidad de agua de los acuíferos publicada en el Diario Oficial de la Federación (2013–2023).",
    cada: "Cuando CONAGUA publica una nueva revisión (cada 2–3 años).",
    dato: `Revisión oficial de ${resumen.anio}`,
    enlace: { href: "/mapa", texto: "Ver el mapa de acuíferos" },
  },
  {
    id: "usos",
    titulo: "Quién se lleva el agua",
    muestra: "Para qué es el agua que se permite sacar, según los permisos registrados. Es lo que el permiso autoriza, no lo que se mide. Sin hidroeléctricas ni agua de mar. Solo se muestran nombres de organizaciones, nunca de personas.",
    colores: GRUPOS_USO.map((g) => ({ color: USO[g].color, label: USO[g].label })),
    fuente: "CONAGUA, Registro Público de Derechos de Agua (REPDA).",
    cada: "Cuando CONAGUA actualiza el registro (pocas veces al año). Se revisa solo lunes y jueves.",
    dato: `Registro al ${fechaCorta(usos.fecha)}`,
  },
  {
    id: "calidad",
    titulo: "Calidad del agua",
    muestra: "El semáforo oficial de cada sitio donde CONAGUA toma muestras en ríos, lagos, presas, costas y pozos. Mide el agua en su fuente, no la que sale de tu llave.",
    colores: (["r", "a", "v"] as const).map((k) => ({
      color: SEMAFORO[k].color,
      label: SEMAFORO[k].label,
      nota: k === "r" ? "Aguas negras, tóxicos; en pozos, no sirve para beber sin tratarla." : k === "a" ? "Bacterias de heces, lodo o poco oxígeno." : "Cumple con todo lo medido.",
    })),
    fuente: "CONAGUA, Red Nacional de Medición de Calidad del Agua.",
    cada: "Una vez al año. Usamos el dato más reciente de cada sitio.",
    dato: `Resultados de ${calidad.anios.join(" y ")}`,
  },
];

export default function Metodologia() {
  return (
    <>
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-6 sm:px-8">
        <Link href="/" aria-label="Sinagua, inicio" className="text-xl"><Marca /></Link>
        <Link href="/mapa" className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white hover:opacity-85">
          Abrir el mapa
        </Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 pt-14 pb-24 sm:px-8">
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.02em]">Cómo se mide</h1>
        <p className="mt-4 max-w-[56ch] text-[1.1rem] leading-relaxed text-ink-2">
          Todo sale de datos públicos oficiales. Cada dato tiene su fecha: unos cambian cada semana y otros, cada año o más.
        </p>
        <nav aria-label="Temas" className="mt-8 flex flex-wrap gap-2">
          {temas.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full bg-raised px-3.5 py-1.5 text-[14px] hover:bg-line">{t.titulo}</a>
          ))}
        </nav>

        <div className="mt-12 space-y-6">
          {temas.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-6 rounded-2xl bg-surface p-6 ring-1 ring-black/5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-serif text-[1.6rem] leading-tight font-semibold">{t.titulo}</h2>
                <p className="text-[13px] font-semibold text-critico">{t.dato}</p>
              </div>
              <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-2">{t.muestra}</p>
              {t.colores && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {t.colores.map((c) => (
                    <li key={c.label} className="flex gap-3 text-[14px]">
                      <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded-[4px] ring-1 ring-black/10" style={{ background: c.color }} />
                      <span>
                        <span className="font-semibold">{c.label}</span>
                        {c.nota && <span className="block text-[13px] text-ink-3">{c.nota}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-[14px] sm:grid-cols-2">
                <div>
                  <dt className="text-[12px] text-ink-3">Fuente</dt>
                  <dd className="mt-0.5">{t.fuente}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink-3">Cada cuánto se actualiza</dt>
                  <dd className="mt-0.5">{t.cada}</dd>
                </div>
              </dl>
              {t.enlace && (
                <Link href={t.enlace.href} className="mt-4 inline-block text-[14px] font-semibold underline underline-offset-4 hover:text-critico">
                  {t.enlace.texto} →
                </Link>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
          Los datos se descargan y procesan solos dos veces por semana; si una fuente publica algo más viejo que lo que ya está
          publicado, no se reemplaza. El código es abierto:{" "}
          <a href="https://github.com/Exmachia/Sinagua" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">github.com/Exmachia/Sinagua</a>.
          ¿Ves un error?{" "}
          <a href={CONTACTO} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">Escríbeme</a>.
        </p>
      </main>
    </>
  );
}
