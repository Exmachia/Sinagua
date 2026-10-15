import type { Metadata } from "next";
import Link from "next/link";
import BotonHistoria from "@/components/BotonHistoria";
import Marca from "@/components/Marca";
import { Ayuda } from "@/components/ui";
import { cacheLife } from "next/cache";
import { alertas, VIGENCIA, type Alerta } from "@/lib/urgente";
import { ilustracion } from "@/og/ilustraciones";

export const metadata: Metadata = {
  title: "Urgente — Sinagua",
  description: "Lo más crítico del agua en México esta semana: presas casi vacías, sequía y agua contaminada. Compártelo.",
  alternates: { canonical: "/urgente" },
};

// Se recalcula a diario: aunque no lleguen datos nuevos, lo que ya no es reciente deja de mostrarse.
async function vigentes() {
  "use cache";
  cacheLife("days");
  return alertas(new Date());
}

export default async function Urgente() {
  const lista = await vigentes();
  const reportes = lista.filter((a) => a.tipo === "reporte");
  const datos = lista.filter((a) => a.tipo !== "reporte");
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-8">
        <Link href="/" aria-label="Sinagua, inicio" className="text-xl"><Marca /></Link>
        <Link href="/mapa" className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white hover:opacity-85">
          Abrir el mapa
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-8 lg:pt-20">
        <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-critico">
          <span aria-hidden className="size-2 rounded-full bg-critico" /> Urgente
        </p>
        <div className="mt-3 flex max-w-3xl items-start gap-3">
          <h1 className="font-serif text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance">
            Lo más crítico del agua esta semana
          </h1>
          <div className="pt-3"><AyudaUrgente /></div>
        </div>
        <p className="mt-5 max-w-[56ch] text-[1.1rem] leading-relaxed text-ink-2">Compártelo en tus historias. Que se sepa.</p>

        {reportes.length > 0 && (
          <section aria-label="Lo que reportan vecinos y medios" className="mt-14 grid gap-6">
            {reportes.map((a) => <TarjetaReporte key={a.id} a={a} />)}
          </section>
        )}

        <section aria-label="Alertas de los datos oficiales" className="mt-6 grid gap-6 md:grid-cols-2">
          {datos.map((a) => <TarjetaAlerta key={a.id} a={a} />)}
        </section>
      </main>
    </>
  );
}

function Etiqueta({ a }: { a: Alerta }) {
  return (
    <p className="text-[13px] font-semibold text-critico">
      {a.etiqueta} · <span className="text-ink-3">{a.lugar}</span>
    </p>
  );
}

function Botones({ a }: { a: Alerta }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <BotonHistoria id={a.id} titulo={a.titulo} lugar={a.lugar} />
      <Link href={a.destino} className="inline-flex min-h-12 items-center rounded-full px-5 font-semibold ring-1 ring-line-strong hover:bg-raised">
        Ver los datos
      </Link>
    </div>
  );
}

function TarjetaAlerta({ a }: { a: Alerta }) {
  return (
    <article id={a.id} className="flex scroll-mt-6 flex-col rounded-2xl bg-surface p-6 ring-1 ring-black/5 sm:p-7">
      <Etiqueta a={a} />
      <h2 className="mt-2 font-serif text-[1.7rem] leading-tight font-semibold text-balance">{a.titulo}</h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        {a.datos.slice(0, 2).map((d) => (
          <div key={d.texto}>
            <dt className={`num font-serif leading-none font-semibold ${d.valor.length > 10 ? "text-[1.3rem]" : "text-[1.9rem]"}`}>{d.valor}</dt>
            <dd className="mt-1 text-[13px] leading-snug text-ink-2">{d.texto}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-5 text-[12px] text-ink-3">Fuente: {a.fuente}</p>
      <Botones a={a} />
    </article>
  );
}

function TarjetaReporte({ a }: { a: Alerta }) {
  const img = ilustracion(a.ilustracion);
  return (
    <article id={a.id} className="grid scroll-mt-6 gap-6 rounded-2xl bg-ink p-6 text-[#f2ebe1] sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="text-[13px] font-semibold text-[#e7a98a]">{a.etiqueta} · {a.lugar}</p>
        <h2 className="mt-2 font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-semibold text-balance">{a.titulo}</h2>
        <ul className="mt-5 max-w-[56ch] space-y-2 text-[16px] leading-snug">
          {a.puntos?.map((p) => (
            <li key={p} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[#e7a98a]" />
              {p}
            </li>
          ))}
        </ul>
        {a.accion && <p className="mt-4 text-[14px] text-[#d9d1c5]">{a.accion}</p>}
        <p className="mt-4 text-[12px] text-[#b8b0a3]">
          Fuentes:{" "}
          {a.fuentes?.map((f, i) => (
            <span key={f.url}>
              {i > 0 && " · "}
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">{f.nombre}</a>
            </span>
          ))}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <BotonHistoria id={a.id} titulo={a.titulo} lugar={a.lugar} />
          <Link href={a.destino} className="inline-flex min-h-12 items-center rounded-full px-5 font-semibold ring-1 ring-white/30 hover:bg-white/10">
            Ver los datos de {a.lugar}
          </Link>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG propio en data URI */}
      {img && <img src={img} alt="" width={150} height={221} className="mx-auto max-md:hidden" />}
    </article>
  );
}

function AyudaUrgente() {
  return (
    <Ayuda titulo="Cómo se eligen las alertas">
      <p>Salen solas de los datos oficiales, con las mismas reglas para todo el país, y se actualizan cada semana:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Presas que dan agua a ciudades, por debajo del 20% y de lo normal para la época.</li>
        <li>Estados donde más de la mitad de la gente vive en sequía.</li>
        <li>Ciudades a las que les quedan menos de 6 meses de agua en sus presas.</li>
      </ul>
      <p>Solo se muestran datos de los últimos {VIGENCIA} días. Si una fuente deja de actualizarse, su alerta desaparece.</p>
      <p>
        Los recuadros oscuros son casos que reportan vecinos y medios. No son datos oficiales: van con su fuente, y separados de
        lo que sí miden CONAGUA y el Servicio Meteorológico.
      </p>
    </Ayuda>
  );
}
