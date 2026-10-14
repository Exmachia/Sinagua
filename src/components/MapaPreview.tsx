import Link from "next/link";
import { colorPct, fmt, RAMPA } from "@/lib/acuiferos";
import geo from "@/data/estados_preview.json";
import resumen from "@/data/resumen.json";

/*
 * Vista previa estática del mapa para la portada: SVG generado en el servidor,
 * sin JavaScript ni gestos, así el scroll de la página nunca se atora.
 * Todo el bloque es un enlace a /mapa.
 */

const W = 1000;
const [O, S, E, N] = [-117.3, 14.4, -86.6, 32.8];
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const H = Math.round(((merc(N) - merc(S)) / ((E - O) * (Math.PI / 180))) * W);
const px = (lon: number) => ((lon - O) / (E - O)) * W;
const py = (lat: number) => ((merc(N) - merc(lat)) / (merc(N) - merc(S))) * H;

type Anillo = [number, number][];
const anillo = (r: Anillo) =>
  r.map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join("") + "Z";

const pctPorEstado = new Map(resumen.estados.map((e) => [e.cve, e.pct]));
const estados = (geo as unknown as GeoJSON.FeatureCollection).features.map((f) => {
  const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return {
    id: String(f.id),
    d: polys.flatMap((p) => p.map((r) => anillo(r as Anillo))).join(""),
    pct: pctPorEstado.get(String(f.id)) ?? 0,
  };
});

export default function MapaPreview() {
  return (
    <section aria-labelledby="mapa-titulo" className="border-t border-line bg-bg">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-8 lg:pt-20 lg:pb-24">
        <div className="mb-8 max-w-2xl">
          <h2 id="mapa-titulo" className="font-serif text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-semibold tracking-[-0.01em] text-balance">
            ¿Qué hay bajo tu municipio?
          </h2>
          <p className="mt-3 text-[1.05rem] text-ink-2">
            Entra al mapa, elige tu estado y tu municipio, y descubre qué acuíferos tienes debajo y cómo están.
          </p>
        </div>

        <Link
          href="/mapa"
          aria-label="Abrir el mapa interactivo de acuíferos"
          className="group relative block overflow-hidden rounded-[14px] bg-[#f1efe9] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_40px_rgba(25,23,20,0.10)] ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-[0_1px_0_rgba(0,0,0,0.04),0_18px_50px_rgba(25,23,20,0.16)]"
        >
          <svg viewBox={`-20 -20 ${W + 40} ${H + 40}`} className="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.015] motion-reduce:transition-none" aria-hidden>
            {estados.map((e) => (
              <path key={e.id} d={e.d} fill={colorPct(e.pct)} stroke="#f1efe9" strokeWidth="1.6" strokeLinejoin="round" />
            ))}
          </svg>

          {/* Módulo sobrepuesto: anticipa la interfaz del mapa real. */}
          <div className="pointer-events-none absolute top-4 left-4 hidden w-[300px] rounded-[10px] bg-surface p-4 shadow-[0_10px_40px_rgba(25,23,20,0.18)] ring-1 ring-black/5 sm:block lg:top-6 lg:left-6 lg:w-[330px]">
            <div className="flex h-10 items-center gap-2 rounded-md bg-raised px-3 text-[14px] text-ink-3">
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              Busca tu municipio…
            </div>
            <p className="mt-4 font-serif text-[2rem] leading-none font-semibold text-critico">{fmt(resumen.pctTerritorio, 0)}%</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-2">del territorio está sobre acuíferos sobreexplotados</p>
          </div>

          {/* Leyenda compacta */}
          <div className="pointer-events-none absolute right-4 bottom-4 hidden rounded-lg bg-surface/95 px-3 py-2 text-[11px] shadow-sm ring-1 ring-black/5 md:block">
            <p className="mb-1 font-semibold text-ink">Territorio sobre acuíferos sobreexplotados</p>
            <div className="flex">
              {RAMPA.map((r) => (
                <div key={r.desde} className="w-9">
                  <div className="h-2 border-r-2 border-surface" style={{ background: r.color }} />
                  <span className="num text-ink-3">{r.desde}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Llamado a la acción */}
          <span className="absolute bottom-4 left-1/2 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold whitespace-nowrap text-white shadow-[0_8px_24px_rgba(25,23,20,0.3)] transition-transform duration-200 group-hover:-translate-y-0.5 md:bottom-auto md:top-1/2 md:left-[62%] md:-translate-y-1/2 md:group-hover:-translate-y-[calc(50%+2px)]">
            <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
            Abrir el mapa
          </span>
        </Link>
      </div>
    </section>
  );
}
