import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import Marca from "@/components/Marca";
import MapaPreview from "@/components/MapaPreview";
import Aparecer from "@/components/landing/Aparecer";
import MinimosPresas from "@/components/landing/MinimosPresas";
import NavFlotante from "@/components/landing/NavFlotante";
import ProyeccionChart from "@/components/landing/ProyeccionChart";
import SequiaChart from "@/components/landing/SequiaChart";
import Cien from "@/components/landing/Cien";
import DiasChart from "@/components/landing/DiasChart";
import { AyudaCalidad, AyudaUsos, BarraSemaforo } from "@/components/Usos";
import { Ayuda, Burbuja, BotonCompartir } from "@/components/ui";
import { albercas, fmt } from "@/lib/acuiferos";
import { fechaCorta, mesLargo } from "@/lib/presas";
import agua from "@/data/agua.json";
import diasAgua from "@/data/dias_agua.json";
import calidad from "@/data/calidad.json";
import usos from "@/data/usos.json";
import { QUE_ES, SEMAFORO, USO, type GrupoUso, type ResumenCalidad } from "@/lib/usos";
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
        <DiasDeAgua />
        <QuienUsa />
        <Calidad />
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
            <strong className="font-semibold text-ink">{escasez10} de cada 10 mexicanos</strong> viven donde el agua ya escasea.
          </p>
          <div className="mt-9 max-w-xl">
            <HeroSearch />
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
      texto: `de agua por persona desde ${porPersona0.y}.`,
      nota: `${fmt(porPersona0.m3, 0)} m³ al año en ${porPersona0.y} → ${fmt(porPersona1.m3, 0)} en ${porPersona1.y}.`,
    },
    {
      valor: `${sq.aniosMitad.length}`,
      de: "años",
      texto: `con más de la mitad del país en sequía desde ${sq.serie[0].f.slice(0, 4)}.`,
      nota: `Los más recientes: ${sq.aniosMitad.filter((y) => y >= 2020).join(", ")}.`,
    },
    {
      valor: `${deCada10} de 10`,
      texto: "mexicanos viven sobre un acuífero del que se saca más agua de la que le entra.",
      nota: `${millones(actual.personas)} millones de personas. Cada año se sacan de más ${fmt(albercas(resumen.hm3Deficit) / 1e6, 1)} millones de albercas olímpicas.`,
    },
    {
      valor: `${presas.actual.debajoNormal}`,
      de: `de ${presas.actual.presas}`,
      texto: "presas principales, muy por debajo de lo normal.",
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
            El agua está en el sureste; la gente, en el centro y el norte.
          </p>
        </Aparecer>
        <Aparecer retraso={120}>
          <figure className="rounded-2xl bg-surface p-6 ring-1 ring-black/5">
            <figcaption className="mb-5">
              <p className="font-semibold">Agua renovable por persona al año</p>
              <p className="text-[13px] text-ink-3">m³ por persona · los {escasos.length} estados con menos agua</p>
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
      <p>
        {fmt(app.pctEscasez, 0)}% de los mexicanos viven en un estado con escasez de agua y {fmt(app.pctAbsoluta, 0)}% en escasez absoluta.
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
            {epoca(sq.actual.f)}, <strong className="font-semibold text-ink">{millones(sq.personas)} millones</strong> viven en sequía.
          </p>
        </Aparecer>
        <Aparecer className="mt-12">
          <figure className="rounded-2xl bg-surface p-6 ring-1 ring-black/5">
            <figcaption className="mb-4">
              <p className="font-semibold">Mexicanos que viven en un municipio con sequía</p>
              <p className="text-[13px] text-ink-3">% de la población, mes a mes</p>
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
            Cada año se suman unos {fmt(pa.pendiente, 0)} acuíferos sobreexplotados.
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
              </Aparecer>
            </li>
          ))}
        </ol>

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
        <strong>¿Significa que nos quedaremos sin agua en {pa.cruces.todos.anio}?</strong> No exactamente: un acuífero sobreexplotado no
        está vacío, se está gastando sus reservas. Cuándo se agoten depende de cuánta agua guarda cada uno, y eso casi nunca se ha medido.
      </p>
      <p>
        Entre {inicial.y} y {actual.y}, los acuíferos sobreexplotados pasaron de {inicial.acuiferos} a {actual.acuiferos}.
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
            {recientes} de los {g.peores.length} años más secos desde {g.anual[0].y} fueron después de 2019.
            {masVacio && <> Hoy, las presas de {masVacio.e} están al <strong className="font-semibold text-ink">{fmt(masVacio.pct, 0)}%</strong>.</>}
          </p>
          <Link href="/presas" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition-opacity hover:opacity-85">
            Ver las presas de tu estado
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </Aparecer>
        <Aparecer retraso={120}>
          <figure className="rounded-2xl bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5">
            <figcaption className="mb-4">
              <p className="font-semibold">El punto más bajo de cada año</p>
              <p className="text-[13px] text-ink-3">% de llenado · en rojo, los años más secos</p>
            </figcaption>
            <MinimosPresas anual={g.anual} tipico={g.minTipico} peores={g.peores} />
          </figure>
        </Aparecer>
      </div>
    </section>
  );
}

/* ---------- 6b. Días de agua ---------- */

type Sistema = (typeof diasAgua.sistemas)[number];
const mesAnio = (f: string) => `${mesLargo(f)} de ${f.slice(0, 4)}`;

const mesesEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (30.44 * 864e5));
const cutz = diasAgua.sistemas.find((s) => s.id === "cutzamala")!;

function DiasDeAgua() {
  const pc = cutz.peor;
  return (
    <section id="dias" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <Aparecer>
          <div className="flex max-w-3xl items-start gap-3">
            <div>
              <p className="text-[14px] font-semibold text-critico">Días de agua</p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance">
                Una sola temporada seca basta para vaciar las presas
              </h2>
            </div>
            <div className="pt-8"><AyudaDias /></div>
          </div>
          <p className="mt-5 max-w-[62ch] text-[1.1rem] leading-relaxed text-ink-2">
            En {mesesEntre(pc.antes.f, pc.f)} meses, el agua del Cutzamala pasó de alcanzar para {fmt(pc.antes.dias, 0)} días a solo{" "}
            <strong className="font-semibold text-ink">{pc.dias}</strong>, si dejara de llover.
          </p>
        </Aparecer>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {diasAgua.sistemas.map((s, i) => (
            <Aparecer key={s.id} retraso={i * 120}>
              <TarjetaSistema s={s} />
            </Aparecer>
          ))}
        </div>
      </div>
    </section>
  );
}

function TarjetaSistema({ s }: { s: Sistema }) {
  const a = s.actual;
  const p = s.peor;
  const baja = s.presaMasBaja;
  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:p-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-[1.6rem] leading-tight font-semibold">{s.nombre}</h3>
          <p className="text-[14px] text-ink-3">{s.ciudad}</p>
        </div>
        <BotonCompartir ruta={`/compartir/dias/${s.id}`} titulo={`${s.nombre}: le quedaron ${p.dias} días de agua`}
          texto={`En ${mesAnio(p.f)}, al ${s.nombre} le quedaban ${p.dias} días de agua. ${mesesEntre(p.antes.f, p.f)} meses antes tenía ${p.antes.dias}.`} />
      </header>

      <p className="mt-6 text-[14px] font-semibold text-critico">Lo más cerca que ha estado · {mesAnio(p.f)}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="num font-serif text-[clamp(3.2rem,7vw,4.5rem)] leading-none font-semibold tracking-[-0.02em]">{fmt(p.dias, 0)}</span>
        <span className="text-[1.1rem] text-ink-2">días de agua</span>
      </p>
      <p className="mt-2 text-[15px] text-ink-2">{mesesEntre(p.antes.f, p.f)} meses antes: {fmt(p.antes.dias, 0)} días.</p>

      <div className="mt-6">
        <DiasChart serie={s.serie as [string, number, number][]} peor={s.peor} nombre={s.nombre} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-2"><Burbuja color="var(--s-critico)" /> Lo más bajo</span>
        <span className="inline-flex items-center gap-2"><Burbuja color="var(--ink)" />
          Hoy: <strong className="num font-semibold text-ink">{fmt(a.dias, 0)} días</strong> ({fmt(a.pct, 0)}% al {fechaCorta(a.f)})</span>
      </div>


      {baja.pct < 10 && (
        <p className="mt-auto pt-5 text-[14px] leading-relaxed text-ink-2">
          En {mesAnio(baja.f)}, la presa {baja.n} quedó al{" "}
          <strong className="num font-semibold text-ink">{fmt(baja.pct, 1)}%</strong>: prácticamente vacía.
        </p>
      )}
    </article>
  );
}

function AyudaDias() {
  return (
    <Ayuda titulo="Cómo calculamos los días de agua">
      <p>
        Dividimos el agua guardada en las presas del sistema entre lo que sale de ellas cada día (el promedio de los últimos 30 días,
        según el Sistema de Información Hidrológica de CONAGUA). Es decir: cuántos días alcanzaría si no volviera a entrar agua y se
        siguiera sacando igual.
      </p>
      <p>Los días reales serían <strong>menos</strong>:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>No toda el agua se puede sacar: la del fondo de la presa no llega a las tomas.</li>
        <li>No contamos lo que se evapora, que en temporada de calor es mucho.</li>
      </ul>
      <p>Y en sentido contrario: en temporada de lluvias entra agua nueva, y cuando escasea se raciona y se saca menos.</p>
      <p>
        Estas presas no son la única fuente: buena parte del agua de ambas ciudades viene de pozos (acuíferos), que también están
        sobreexplotados. En Monterrey, parte de lo que sale de El Cuchillo también es para riego.
      </p>
    </Ayuda>
  );
}

/* ---------- 6c. ¿Quién se lleva el agua? ---------- */

function QuienUsa() {
  const grupos = usos.grupos as Record<GrupoUso, number>;
  const campo10 = Math.round((grupos.campo / usos.total) * 10);
  const empresas = usos.empresas.slice(0, 5);
  const personas = (hm3: number) => (hm3 * 1e6) / usos.m3PersonaCiudad;
  return (
    <section id="usos" className="scroll-mt-20 border-t border-line bg-raised">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-32">
        <Aparecer>
          <div className="flex items-start gap-3">
            <div>
              <p className="text-[14px] font-semibold text-critico">¿Quién se lleva el agua?</p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance">
                El campo se lleva {campo10} de cada 10 litros
              </h2>
            </div>
            <div className="pt-8"><AyudaUsos /></div>
          </div>
          <p className="mt-5 max-w-[52ch] text-[1.1rem] leading-relaxed text-ink-2">
            A las ciudades, donde vive casi todo el país, les tocan {Math.round((grupos.ciudades / usos.total) * 100)}.
          </p>
          <div className="mt-10"><Cien grupos={grupos} /></div>
        </Aparecer>

        <Aparecer retraso={120}>
          <div className="rounded-2xl bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:p-8">
            <h3 className="font-serif text-[1.6rem] leading-tight font-semibold">Las empresas con más agua</h3>
            <ol className="mt-6 divide-y divide-line border-t border-line">
              {empresas.map((e, i) => (
                <li key={e.n} className="py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="num w-4 shrink-0 text-[13px] text-ink-3">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-semibold">{e.n}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-3">
                        <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: USO[e.g as GrupoUso].color }} />
                        {USO[e.g as GrupoUso].label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 pl-7 text-[15px] text-ink-2">
                    Agua de <strong className="num font-semibold text-ink">{fmt(personas(e.hm3) / 1e6, 1)} millones de personas</strong>
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] text-ink-3">Permisos de CONAGUA al {fechaCorta(usos.fecha)}</p>
          </div>
          <Link href="/mapa" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition-opacity hover:opacity-85">
            Ver quién la usa en tu estado
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </Aparecer>
      </div>
    </section>
  );
}

/* ---------- 6d. ¿Está limpia? ---------- */

function TarjetaCalidad({ titulo, r, rojo }: { titulo: string; r: ResumenCalidad; rojo: string }) {
  const pct = (k: "r" | "a" | "v") => Math.round((r[k] / r.n) * 100);
  return (
    <article className="rounded-2xl bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:p-7">
      <h3 className="font-semibold">{titulo}</h3>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
        <span className="num font-serif text-[clamp(3rem,6vw,4rem)] leading-none font-semibold tracking-[-0.02em]">{pct("r")}%</span>
        <span className="text-[1.05rem] text-ink-2">{rojo}</span>
      </p>
      <div className="mt-5"><BarraSemaforo r={r} /></div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        {(["r", "a", "v"] as const).map((k) => (
          <li key={k} className="inline-flex items-center gap-2">
            <Burbuja color={SEMAFORO[k].color} /> {SEMAFORO[k].label} <span className="num font-semibold text-ink">{pct(k)}%</span>
          </li>
        ))}
      </ul>
      <ul className="mt-6 flex flex-wrap gap-2">
        {(r.q as [string, number][]).slice(0, 3).map(([q]) => (
          <li key={q} className="rounded-full bg-raised px-3 py-1.5 text-[14px]">{QUE_ES[q] ?? q}</li>
        ))}
      </ul>
    </article>
  );
}

function Calidad() {
  const sup = calidad.superficie as ResumenCalidad;
  const pozo = calidad.pozo as ResumenCalidad;
  const de10 = Math.round((sup.r / sup.n) * 10);
  return (
    <section id="calidad" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <Aparecer>
          <div className="flex max-w-3xl items-start gap-3">
            <div>
              <p className="text-[14px] font-semibold text-critico">¿Está limpia?</p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance">
                {de10} de cada 10 ríos, lagos y presas medidos están contaminados
              </h2>
            </div>
            <div className="pt-8"><AyudaCalidad /></div>
          </div>
          <p className="mt-5 max-w-[62ch] text-[1.1rem] leading-relaxed text-ink-2">
            De las {calidad.presas.n} presas principales que se miden, <strong className="font-semibold text-ink">{calidad.presas.r} están contaminadas</strong>.
          </p>
        </Aparecer>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Aparecer><TarjetaCalidad titulo="Ríos, lagos y presas" r={sup} rojo="contaminados" /></Aparecer>
          <Aparecer retraso={120}><TarjetaCalidad titulo="Pozos" r={pozo} rojo="no sirven para beber sin tratarla" /></Aparecer>
        </div>
        <Aparecer>
          <div className="mt-10 max-w-3xl border-l-4 border-critico pl-5">
            <p className="font-semibold">Esto no es el agua de tu llave: se mide en ríos, presas y pozos.</p>
            <p className="mt-1 text-ink-2">Si la tuya sale turbia o con olor, no la tomes.</p>
          </div>
          <Link href="/mapa" className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition-opacity hover:opacity-85">
            Ver cómo está el agua en tu estado
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
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
    ["Días de agua", "Agua guardada en las presas del Sistema Cutzamala (Valle de Bravo, Villa Victoria y El Bosque) y de Monterrey (El Cuchillo, Cerro Prieto y La Boca), entre lo que sale cada día por sus tomas (promedio de 30 días). Fuente: SIH-CONAGUA, datos diarios."],
    ["Quién usa el agua", "Registro Público de Derechos de Agua (REPDA, CONAGUA): cada permiso con su uso, titular y volumen anual, ubicado por los anexos de cada pozo, río o presa. Sin hidroeléctricas (el agua regresa a su cauce). Nombres solo de organizaciones."],
    ["Calidad del agua", "Red Nacional de Medición de Calidad del Agua (CONAGUA): semáforo oficial de cada sitio de monitoreo en ríos, lagos, presas, costas y pozos; dato más reciente de 2023 o, si no hay, de 2021. Mide el agua en su fuente, no la de la llave."],
    ["Proyección", "Escenario de continuidad: una recta ajustada a las 5 actualizaciones oficiales, con su intervalo de predicción del 95%. No es un pronóstico: cambia si cambian los permisos o la lluvia."],
  ];
  return (
    <section id="metodologia" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-28">
        <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold tracking-[-0.01em]">Cómo leer estos datos</h2>
        <div className="mt-10 grid gap-x-14 md:grid-cols-2">
          {bloques.map(([t, d]) => (
            <details key={t} className="group border-t border-line-strong">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {t}
                <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <p className="pb-5 leading-relaxed text-ink-2">{d}</p>
            </details>
          ))}
        </div>
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
