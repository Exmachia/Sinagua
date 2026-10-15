import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import Marca from "@/components/Marca";
import MapaPreview from "@/components/MapaPreview";
import Aparecer from "@/components/landing/Aparecer";
import MinimosPresas from "@/components/landing/MinimosPresas";
import NavFlotante from "@/components/landing/NavFlotante";
import ProyeccionChart from "@/components/landing/ProyeccionChart";
import SequiaChart from "@/components/landing/SequiaChart";
import { Ayuda } from "@/components/ui";
import { albercas, fmt } from "@/lib/acuiferos";
import { fechaCorta, mesLargo } from "@/lib/presas";
import agua from "@/data/agua.json";
import presas from "@/data/presas_resumen.json";
import proy from "@/data/proyecciones.json";
import resumen from "@/data/resumen.json";

const HOY = Number(agua.sequia.actual.f.slice(0, 4)); // año del dato más reciente: avanza solo con cada actualización
const actual = proy.serie[proy.serie.length - 1];
const inicial = proy.serie[0];
const pa = proy.proyecciones.acuiferos;
const pp = proy.proyecciones.personas;
const millones = (n: number) => fmt(n / 1e6, 1);
const deCada10 = Math.round((actual.personas / proy.poblacion) * 10);
const app = agua.aguaPorPersona;
const porPersona0 = app.nacional[0];
const porPersona1 = app.nacional[app.nacional.length - 1];
const caida = Math.round((1 - porPersona1.m3 / porPersona0.m3) * 100);
const escasez10 = Math.round(app.pctEscasez / 10);
const sq = agua.sequia;

export default function Home() {
  return (
    <>
      <NavFlotante />
      <main id="inicio">
        <Portada />
        <Realidad />
        <PorEstado />
        <Sequia />
        <Proyeccion />
        <Presas />
        <MapaPreview />
        <Metodologia />
      </main>
      <Pie />
    </>
  );
}

/* ---------- 1. Portada ---------- */

function Portada() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-32 pb-20 sm:px-8 lg:pt-40 lg:pb-28">
      <div className="grid items-end gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="text-[14px] font-semibold text-critico">El agua de México · datos oficiales</p>
          <h1 className="mt-4 font-serif text-[clamp(2.4rem,5.4vw,4.3rem)] leading-[1.02] font-semibold tracking-[-0.02em] text-balance">
            México se está quedando sin agua
          </h1>
          <p className="mt-6 max-w-[56ch] text-[1.2rem] leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">{escasez10} de cada 10 mexicanos</strong> viven donde el agua ya escasea. A cada
            persona le toca <strong className="font-semibold text-ink">{caida}% menos agua</strong> que en {porPersona0.y}, y en los
            años secos más de la mitad del país vive en sequía.
          </p>
          <div className="mt-9 max-w-xl">
            <HeroSearch />
            <p className="mt-2 text-[13px] text-ink-3">Mira cómo está el agua donde vives.</p>
          </div>
        </div>
        <Aparecer retraso={150}>
          <Personas llenas={escasez10} />
        </Aparecer>
      </div>
    </section>
  );
}

/** 10 figuras; las que viven en un estado con escasez de agua, rellenas. */
function Personas({ llenas }: { llenas: number }) {
  return (
    <figure>
      <div className="grid grid-cols-5 gap-x-3 gap-y-5" role="img" aria-label={`${llenas} de cada 10 personas viven en un estado con escasez de agua`}>
        {Array.from({ length: 10 }, (_, i) => (
          <svg key={i} viewBox="0 0 24 48" className="h-auto w-full" aria-hidden>
            <circle cx="12" cy="7" r="6" fill={i < llenas ? "var(--s-critico)" : "var(--line-strong)"} />
            <path d="M3 18a9 9 0 0 1 18 0v12h-4v16h-10V30H3Z" fill={i < llenas ? "var(--s-critico)" : "var(--line-strong)"} />
          </svg>
        ))}
      </div>
      <figcaption className="mt-5 text-[14px] text-ink-2">
        <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-critico" />Vive donde el agua escasea</span>
        <span className="ml-5 inline-flex items-center gap-2"><span className="size-3 rounded-full bg-line-strong" />No</span>
      </figcaption>
    </figure>
  );
}

/* ---------- 2. La realidad ---------- */

function Realidad() {
  const cifras = [
    {
      valor: `−${caida}%`,
      texto: "de agua por persona: a cada mexicano le toca cada vez menos.",
      nota: `${fmt(porPersona0.m3, 0)} m³ al año en ${porPersona0.y} → ${fmt(porPersona1.m3, 0)} en ${porPersona1.y}.`,
    },
    {
      valor: `${sq.aniosMitad.length}`,
      de: "años",
      texto: `en los que más de la mitad del país vivió en sequía desde ${sq.serie[0].f.slice(0, 4)}.`,
      nota: `Los más recientes: ${sq.aniosMitad.filter((y) => y >= 2020).join(", ")}.`,
    },
    {
      valor: `${deCada10} de 10`,
      texto: "mexicanos viven sobre un acuífero sobreexplotado: se saca más agua del subsuelo de la que entra.",
      nota: `${millones(actual.personas)} millones de personas. Cada año se sacan de más ${fmt(albercas(resumen.hm3Deficit) / 1e6, 1)} millones de albercas olímpicas.`,
    },
    {
      valor: `${presas.actual.debajoNormal}`,
      de: `de ${presas.actual.presas}`,
      texto: "presas principales están muy por debajo de lo normal para esta época del año.",
      nota: `Datos de CONAGUA al ${fechaCorta(presas.ultima)}.`,
    },
  ];
  return (
    <section id="realidad" className="scroll-mt-20 bg-ink text-[#f2ebe1]">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <Aparecer>
          <p className="text-[14px] font-semibold text-[#e7a98a]">La realidad</p>
          <h2 className="mt-3 max-w-[22ch] font-serif text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.015em]">
            Cada año hay menos agua, y más gente que la necesita
          </h2>
        </Aparecer>
        <div className="mt-16 grid gap-x-12 gap-y-14 sm:grid-cols-2">
          {cifras.map((c, i) => (
            <Aparecer key={c.texto} retraso={i * 90}>
              <div className="border-t border-white/15 pt-6">
                <p className="num font-serif text-[clamp(3rem,6vw,4.6rem)] leading-none font-semibold">
                  {c.valor}
                  {c.de && <span className="ml-2 font-sans text-[1.1rem] font-medium text-[#b8b0a3]">{c.de}</span>}
                </p>
                <p className="mt-4 max-w-[34ch] text-[1.1rem] leading-snug">{c.texto}</p>
                <p className="mt-2 text-[14px] text-[#b8b0a3]">{c.nota}</p>
              </div>
            </Aparecer>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Por estado: agua por persona ---------- */

function PorEstado() {
  const { umbrales } = app;
  const escasos = app.estados.filter((e) => e.m3 < umbrales.estres);
  const tope = umbrales.estres;
  return (
    <section id="estados" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:py-32">
        <Aparecer>
          <p className="text-[14px] font-semibold text-critico">Por estado</p>
          <div className="mt-3 flex items-start gap-3">
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance">
              En la Ciudad de México le tocan {fmt(app.estados[0].m3, 0)} m³ de agua al año a cada persona. En Chiapas, {fmt(app.estados[app.estados.length - 1].m3, 0)}.
            </h2>
            <div className="pt-2"><AyudaPorPersona /></div>
          </div>
          <p className="mt-5 text-[1.1rem] leading-relaxed text-ink-2">
            El agua de México está donde vive poca gente: el sureste concentra la lluvia, y el centro y el norte, la población y la
            industria. {escasos.length} estados están por debajo del umbral internacional de estrés hídrico.
          </p>
          <p className="mt-4 text-[1.1rem] leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">{fmt(app.pctEscasez, 0)}% de los mexicanos</strong> viven en un estado con escasez
            de agua y <strong className="font-semibold text-ink">{fmt(app.pctAbsoluta, 0)}%</strong> en escasez absoluta.
          </p>
        </Aparecer>
        <Aparecer retraso={120}>
          <figure className="rounded-2xl bg-surface p-6 ring-1 ring-black/5">
            <figcaption className="mb-5">
              <p className="font-semibold">Agua renovable por persona al año</p>
              <p className="text-[13px] text-ink-3">m³ por habitante · {escasos.length} estados con menos de {fmt(tope, 0)} · CONAGUA, {porPersona1.y}</p>
            </figcaption>
            <ol className="space-y-2">
              {escasos.map((e) => {
                const nivel = e.m3 < umbrales.absoluta ? "var(--s-critico)" : e.m3 < umbrales.escasez ? "var(--s-deficit)" : "var(--s-limite)";
                return (
                  <li key={e.e} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 text-[14px] max-sm:grid-cols-[6.5rem_1fr_3rem] max-sm:text-[13px]">
                    <span className="truncate">{e.e}</span>
                    <span className="relative h-3 rounded-full bg-raised">
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max((e.m3 / tope) * 100, 2)}%`, background: nivel }} />
                      {[umbrales.absoluta, umbrales.escasez].map((u) => (
                        <span key={u} aria-hidden className="absolute -inset-y-1 w-px bg-ink/40" style={{ left: `${(u / tope) * 100}%` }} />
                      ))}
                    </span>
                    <span className="num text-right font-semibold">{fmt(e.m3, 0)}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-critico" />Escasez absoluta (&lt; {umbrales.absoluta})</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-deficit" />Escasez (&lt; {fmt(umbrales.escasez, 0)})</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-limite" />Estrés (&lt; {fmt(umbrales.estres, 0)})</span>
            </div>
          </figure>
        </Aparecer>
      </div>
    </section>
  );
}

function AyudaPorPersona() {
  return (
    <Ayuda titulo="Agua por persona">
      <p>
        Es el <strong>agua renovable</strong> (la que traen cada año los ríos y la lluvia que se filtra al subsuelo) dividida entre los
        habitantes. CONAGUA la publica por estado.
      </p>
      <p>
        Usamos los umbrales internacionales de Falkenmark, los más usados por la ONU: con menos de <strong>1,700 m³</strong> por persona
        al año hay <strong>estrés hídrico</strong>; con menos de <strong>1,000</strong>, <strong>escasez</strong>; con menos de{" "}
        <strong>500</strong>, <strong>escasez absoluta</strong>.
      </p>
      <p>
        A nivel nacional, el agua por persona bajó de {fmt(porPersona0.m3, 0)} m³ en {porPersona0.y} a {fmt(porPersona1.m3, 0)} en{" "}
        {porPersona1.y}: la lluvia no aumenta y la población sí.
      </p>
      <p className="text-[13px] text-ink-3">
        Fuente: CONAGUA, vía SEMARNAT, Compendio de Estadísticas Ambientales 2021 (dato estatal de {porPersona1.y}); población: Censo 2020.
      </p>
    </Ayuda>
  );
}

/* ---------- 4. Sequía ---------- */

/** Frase sobre la época del dato más reciente, para que el texto siga siendo cierto con cada actualización. */
function epoca(iso: string) {
  const mes = Number(iso.slice(5, 7));
  const cuando = `Al ${fechaCorta(iso)}`;
  if (mes >= 9 && mes <= 10) return `${cuando}, al terminar la temporada de lluvias`;
  if (mes >= 6 && mes <= 8) return `${cuando}, en plena temporada de lluvias`;
  if (mes >= 3 && mes <= 5) return `${cuando}, en lo más fuerte de la temporada seca`;
  return `${cuando}, en la temporada seca`;
}

function Sequia() {
  const recientes = sq.aniosMitad.filter((y) => y >= 2020);
  // Titular: el pico más reciente por encima de 80% (si no hay, el récord histórico).
  const pico = [...sq.serie].reverse().find((s) => s.pct >= 80) ?? sq.peor;
  const picoAnio = pico.f.slice(0, 4);
  const mismoPico = sq.serie.filter((s) => s.f.startsWith(picoAnio)).reduce((a, b) => (b.pct > a.pct ? b : a));
  return (
    <section id="sequia" className="scroll-mt-20 border-t border-line bg-raised">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <Aparecer>
          <p className="text-[14px] font-semibold text-critico">Sequía</p>
          <h2 className="mt-3 max-w-[24ch] font-serif text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.015em]">
            En {mesLargo(mismoPico.f)} de {picoAnio}, casi {Math.round(mismoPico.pct / 10)} de cada 10 mexicanos vivían en sequía
          </h2>
          <p className="mt-5 max-w-[62ch] text-[1.1rem] leading-relaxed text-ink-2">
            {mismoPico.f !== sq.peor.f && <>El récord fue {sq.peor.f.slice(0, 4)}, con {fmt(sq.peor.pct, 0)}%. </>}
            Desde {sq.serie[0].f.slice(0, 4)}, en {sq.aniosMitad.length} años más de la mitad del país vivió en sequía en algún momento;{" "}
            {recientes.length} de ellos en esta década ({recientes.join(", ")}). {epoca(sq.actual.f)},{" "}
            <strong className="font-semibold text-ink">{millones(sq.personas)} millones</strong> viven en sequía.
          </p>
        </Aparecer>
        <Aparecer className="mt-12">
          <figure className="rounded-2xl bg-surface p-6 ring-1 ring-black/5">
            <figcaption className="mb-4">
              <p className="font-semibold">Mexicanos que viven en un municipio con sequía</p>
              <p className="text-[13px] text-ink-3">% de la población, mes a mes · Monitor de Sequía de México (SMN) y Censo 2020</p>
            </figcaption>
            <SequiaChart serie={sq.serie} />
          </figure>
        </Aparecer>
      </div>
    </section>
  );
}

/* ---------- 5. Si seguimos así ---------- */

function Proyeccion() {
  const c = pa.cruces;
  const hitos = [
    { pct: 50, label: "la mitad", anio: c.mitad.anio ?? null },
    { pct: 75, label: "tres de cada cuatro", anio: c.tresCuartos.anio ?? null },
    { pct: 100, label: "todos", anio: c.todos.anio ?? null },
  ];
  const tarjetas = [
    {
      anio: c.mitad.anio, rango: `${c.mitad.desde}–${c.mitad.hasta}`,
      titulo: "La mitad de los acuíferos, sobreexplotados",
      texto: (c.mitad.anio ?? HOY + 1) <= HOY
        ? "Según la tendencia, el umbral ya se habría cruzado. La próxima actualización oficial lo confirmará."
        : `Faltarían ${(c.mitad.anio ?? HOY) - HOY} años, según la tendencia.`,
    },
    {
      anio: pp.cruces.tresCuartos.anio, rango: `${pp.cruces.tresCuartos.desde}–${pp.cruces.tresCuartos.hasta}`,
      titulo: "3 de cada 4 mexicanos sobre un acuífero sobreexplotado",
      texto: `Hoy son ${deCada10} de cada 10. Cada año se suman cerca de ${fmt(Math.round(pp.pendiente / 1e5) / 10, 1)} millones de personas.`,
    },
    {
      anio: c.tresCuartos.anio, rango: `${c.tresCuartos.desde}–${c.tresCuartos.hasta}`,
      titulo: "Tres de cada cuatro acuíferos, sobreexplotados",
      texto: `A un ritmo de ${fmt(pa.pendiente, 0)} acuíferos más por año, como en la última década.`,
    },
    {
      anio: c.todos.anio, rango: `${c.todos.desde} o después`,
      titulo: "Todos los acuíferos del país, sobreexplotados",
      texto: "Ninguno tendría agua disponible para nuevos permisos: todo lo que se saque de más saldría de las reservas.",
    },
  ];

  return (
    <section id="proyeccion" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <Aparecer>
          <p className="text-[14px] font-semibold text-critico">Si seguimos así</p>
          <div className="mt-3 flex items-start gap-3">
            <h2 className="max-w-[24ch] font-serif text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.015em]">
              A este ritmo, hacia {c.todos.anio} ningún acuífero de México tendría agua disponible
            </h2>
            <div className="pt-2"><AyudaProyeccion /></div>
          </div>
          <p className="mt-5 max-w-[60ch] text-[1.1rem] leading-relaxed text-ink-2">
            Entre {inicial.y} y {actual.y}, los acuíferos sobreexplotados pasaron de {inicial.acuiferos} a {actual.acuiferos}: unos{" "}
            {fmt(pa.pendiente, 0)} más cada año, a un paso casi constante. Si nada cambia, este es el camino.
          </p>
        </Aparecer>

        <Aparecer className="mt-14">
          <ProyeccionChart serie={proy.serie} curva={pa.curva as [number, number, number, number][]} total={proy.total} hoy={HOY} hitos={hitos} />
        </Aparecer>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((t, i) => (
            <li key={t.titulo} className="bg-bg">
              <Aparecer retraso={i * 80} className="h-full p-6">
                <p className="num font-serif text-[3rem] leading-none font-semibold">{t.anio}</p>
                <p className="num mt-1 text-[13px] text-ink-3">rango probable {t.rango}</p>
                <p className="mt-5 text-[1.05rem] leading-snug font-semibold">{t.titulo}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{t.texto}</p>
              </Aparecer>
            </li>
          ))}
        </ol>

        <p className="mt-10 max-w-[70ch] border-l-2 border-ink pl-4 text-[15px] leading-relaxed text-ink-2">
          <strong className="font-semibold text-ink">¿Significa que nos quedaremos sin agua en {c.todos.anio}?</strong> No exactamente: un
          acuífero sobreexplotado no está vacío, se está gastando sus reservas. Cuándo se agoten depende de cuánta agua guarda cada uno, y eso
          casi nunca se ha medido. Lo que sí sabemos es que cada año sin cambios acerca ese momento.
        </p>
      </div>
    </section>
  );
}

function AyudaProyeccion() {
  return (
    <Ayuda titulo="Cómo hicimos esta proyección">
      <p>
        Usamos las <strong>5 revisiones oficiales</strong> del agua subterránea que CONAGUA publicó en el Diario Oficial de la Federación
        ({proy.serie.map((s) => s.y).join(", ")}) y trazamos una línea recta sobre el número de acuíferos sobreexplotados.
      </p>
      <p>
        La recta explica el {fmt(pa.r2 * 100, 0)}% de la variación: el aumento ha sido muy constante. El <strong>rango probable</strong> es
        un intervalo de predicción del 95%; es amplio porque solo hay 5 datos.
      </p>
      <p>
        Es un <strong>escenario</strong>, no un pronóstico: supone que se siguen dando permisos para sacar agua al mismo ritmo que en la
        última década. Si se dejan de otorgar, se recuperan acuíferos o cambia la lluvia, el camino cambia.
      </p>
      <p>
        Las personas se calculan con el <strong>Censo 2020 (INEGI)</strong>: cada localidad se ubicó sobre su acuífero. La población se
        mantiene fija en 2020, así que el cambio viene solo de los acuíferos que se vuelven sobreexplotados.
      </p>
    </Ayuda>
  );
}

/* ---------- 6. Presas ---------- */

function Presas() {
  const g = presas.grupos.nacional;
  const recientes = g.peores.filter((y) => y >= 2020).length;
  const masVacio = [...presas.estados].sort((a, b) => a.pct - b.pct)[0];
  return (
    <section id="presas" className="scroll-mt-20 border-t border-line bg-raised">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center lg:py-32">
        <Aparecer>
          <p className="text-[14px] font-semibold text-critico">Presas</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance">
            Los años secos son cada vez más seguidos
          </h2>
          <p className="mt-5 text-[1.1rem] leading-relaxed text-ink-2">
            Las presas se llenan con las lluvias y se vacían en la temporada seca. {recientes} de los {g.peores.length} años más secos
            desde {g.anual[0].y} fueron después de 2019.
          </p>
          {masVacio && (
            <p className="mt-4 text-[1.1rem] leading-relaxed text-ink-2">
              Al {fechaCorta(presas.ultima)}, el estado con las presas más vacías es{" "}
              <strong className="font-semibold text-ink">{masVacio.e}</strong>: al{" "}
              <strong className="font-semibold text-ink">{fmt(masVacio.pct, 0)}%</strong> de su capacidad.
            </p>
          )}
          <Link href="/presas" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition-opacity hover:opacity-85">
            Ver las presas de tu estado
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </Aparecer>
        <Aparecer retraso={120}>
          <figure className="rounded-2xl bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5">
            <figcaption className="mb-4">
              <p className="font-semibold">El punto más bajo de cada año</p>
              <p className="text-[13px] text-ink-3">% de llenado · {g.presas} presas principales · en rojo, los {g.peores.length} años más secos</p>
            </figcaption>
            <MinimosPresas anual={g.anual} tipico={g.minTipico} peores={g.peores} />
          </figure>
        </Aparecer>
      </div>
    </section>
  );
}

/* ---------- 7. Metodología ---------- */

function Metodologia() {
  const bloques: [string, string][] = [
    ["Agua por persona", "Agua renovable (ríos y lluvia que se filtra al subsuelo) entre habitantes, por estado (CONAGUA vía SEMARNAT). Umbrales de Falkenmark: estrés < 1,700 m³ por persona al año, escasez < 1,000, escasez absoluta < 500."],
    ["Sequía", "Monitor de Sequía de México (SMN-CONAGUA): categoría de sequía de cada municipio cada quincena desde 2003. Contamos como sequía las categorías moderada a excepcional (D1–D4) y la población del Censo 2020 de cada municipio."],
    ["Acuíferos sobreexplotados", "Cuando los permisos para sacar agua superan lo que le entra cada año (la lluvia que se filtra, menos lo que debe seguir llegando a ríos y manantiales). CONAGUA lo llama “déficit”. Fuente: CONAGUA, disponibilidad publicada en el DOF (2013–2023)."],
    ["Territorio y personas", "Cruzamos los 653 acuíferos con los 2,475 municipios y las localidades del Censo 2020 de INEGI para medir qué parte del territorio y de la población está sobre acuíferos sobreexplotados."],
    ["Presas", "Monitoreo de las ~210 presas principales de CONAGUA (SINA y Sistema de Información Hidrológica), semana a semana desde 1991 y hasta la semana más reciente. Descartamos registros físicamente imposibles."],
    ["Proyección", "Escenario de continuidad: una recta ajustada a las 5 actualizaciones oficiales, con su intervalo de predicción del 95%. No es un pronóstico: cambia si cambian los permisos o la lluvia."],
  ];
  return (
    <section id="metodologia" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-28">
        <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold tracking-[-0.01em]">Cómo leer estos datos</h2>
        <dl className="mt-12 grid gap-x-14 gap-y-10 md:grid-cols-2">
          {bloques.map(([t, d]) => (
            <div key={t} className="border-t border-line-strong pt-5">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-2 leading-relaxed text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 max-w-[70ch] text-[14px] leading-relaxed text-ink-3">
          Lo que estos datos no dicen: medimos el agua que se <em>permite</em> sacar, no la que realmente se saca. La extracción real puede ser mayor por
          pozos sin registro. Muchos acuíferos no se reestudian en cada publicación. Mapa base: © OpenStreetMap, OpenFreeMap.
        </p>
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="border-t border-ink">
      <div className="mx-auto max-w-6xl px-4 py-10 text-[14px] text-ink-3 sm:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Marca className="text-xl text-ink" />
          <span>Datos públicos oficiales: CONAGUA, DOF, SMN, INEGI y SEMARNAT.</span>
        </div>
        <p className="mt-4 max-w-[70ch]">
          Proyecto ciudadano independiente. No está afiliado a la Comisión Nacional del Agua (CONAGUA) ni a ninguna dependencia de
          gobierno; el nombre es una parodia.
        </p>
      </div>
    </footer>
  );
}
