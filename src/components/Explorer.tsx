"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  albercas,
  colorPct,
  volumen,
  ESTATUS,
  fmt,
  fraseLitros,
  ORDEN,
  RAMPA,
  type Acuifero,
  type Bbox,
  type Estado,
  type Municipio,
} from "@/lib/acuiferos";
import type { Margen, Vista } from "./AquiferMap";
import resumen from "@/data/resumen.json";
import calidad from "@/data/calidad.json";
import { SEMAFORO, type ResumenCalidad, type SitioCalidad, type UsoLugar, type UsosEstado } from "@/lib/usos";
import { BloqueCalidad, BloqueUsos, useJson } from "./Usos";
import HistoryChart from "./HistoryChart";
import Conmutador from "./Conmutador";
import LeyendaMapa from "./LeyendaMapa";
import PanelMapa, { visibleMovil, type Nivel } from "./PanelMapa";
import SearchBox from "./SearchBox";
import { Ayuda, ayudaAbierta, BotonInicio, BotonCompartir, Burbuja, Cabeza, Cifra, Esqueleto, Fila, Pista, Seccion, VerMas } from "./ui";

const AquiferMap = dynamic(() => import("./AquiferMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-3">Cargando mapa…</div>,
});

type Datos = { acuiferos: Acuifero[]; municipios: Municipio[]; estados: Estado[] };

/* ---------- estado de la URL: #e=guanajuato&m=11020&a=1113 ---------- */

const NAV_EVENT = "sinagua:nav";

function suscribirHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  window.addEventListener(NAV_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
    window.removeEventListener(NAV_EVENT, cb);
  };
}

const ESCRITORIO = "(min-width: 1024px)";
function suscribirMedia(cb: () => void) {
  const mq = window.matchMedia(ESCRITORIO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function hashDe(v: Vista, estados: Map<string, Estado>) {
  const p = new URLSearchParams();
  if (v.e) p.set("e", estados.get(v.e)?.slug ?? v.e);
  if (v.m) p.set("m", v.m);
  if (v.a) p.set("a", v.a);
  const s = p.toString();
  return s ? `#${s}` : "";
}

/** El acuífero que tiene debajo la mayor parte de un municipio. */
const acuiferoDe = (m: Municipio | undefined) => m?.a[0]?.[0] ?? null;

/**
 * Lee la vista: estado → acuífero (ya no hay nivel de municipio). Un enlace viejo o una búsqueda con municipio
 * lleva al acuífero que tiene debajo, dentro de su estado.
 */
function leerVista(hash: string, d: Datos | null, porSlug: Map<string, Estado>, mun: Map<string, Municipio>, acu: Map<string, Acuifero>): Vista {
  const p = new URLSearchParams(hash.slice(1));
  const m = p.get("m");
  let a = p.get("a");
  let e = p.get("e");
  if (e && porSlug.has(e)) e = porSlug.get(e)!.cve;
  if (!d) return { e, m: null, a };
  if (m && !a) a = acuiferoDe(mun.get(m));
  if (!e && m) e = mun.get(m)?.ent ?? null;
  if (!e && a) e = acu.get(a)?.st[0] ?? null;
  return { e, m: null, a: a && acu.has(a) ? a : null };
}

/** El nivel de arriba de la vista actual (acuífero → estado → México). */
function arriba(v: Vista): Vista {
  if (v.a) return { e: v.e, m: null, a: null };
  return { e: null, m: null, a: null };
}

export default function Explorer() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [abierto, setAbierto] = useState(true);
  const [nivel, setNivel] = useState<Nivel>("medio");
  const [verCalidad, setVerCalidad] = useState(true);
  const seccion = useRef<HTMLElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const hash = useSyncExternalStore(suscribirHash, () => window.location.hash, () => "");
  const escritorio = useSyncExternalStore(suscribirMedia, () => window.matchMedia(ESCRITORIO).matches, () => true);

  useEffect(() => {
    let vivo = true;
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(u))));
    Promise.all([get("/data/acuiferos.json"), get("/data/municipios.json"), get("/data/estados.json")])
      .then(([acuiferos, municipios, estados]) => vivo && setD({ acuiferos, municipios, estados }))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [intento]);

  const idx = useMemo(() => ({
    acu: new Map((d?.acuiferos ?? []).map((a) => [a.c, a])),
    mun: new Map((d?.municipios ?? []).map((m) => [m.g, m])),
    est: new Map((d?.estados ?? []).map((e) => [e.cve, e])),
    slug: new Map((d?.estados ?? []).map((e) => [e.slug, e])),
  }), [d]);

  const vista = useMemo(() => leerVista(hash, d, idx.slug, idx.mun, idx.acu), [hash, d, idx]);
  const estado = vista.e ? idx.est.get(vista.e) ?? null : null;
  const acuifero = vista.a ? idx.acu.get(vista.a) ?? null : null;

  function navegar(destino: Vista) {
    // Del buscador puede llegar un municipio: se abre su acuífero principal.
    const v: Vista = destino.m && !destino.a
      ? { e: destino.e ?? idx.mun.get(destino.m)?.ent ?? null, m: null, a: acuiferoDe(idx.mun.get(destino.m)) }
      : { ...destino, m: null };
    const h = hashDe(v, idx.est);
    if (h !== window.location.hash) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${h}`);
      window.dispatchEvent(new Event(NAV_EVENT));
    }
    setAbierto(true);
    setNivel((n) => (n === "bajo" ? "medio" : n));
  }

  // Cada cambio de vista empieza el módulo desde arriba.
  useEffect(() => {
    cuerpo.current?.scrollTo({ top: 0 });
  }, [hash]);

  // Esc sube un nivel (si no se está escribiendo).
  const subir = useRef<() => void>(() => {});
  useEffect(() => {
    subir.current = () => (vista.e || vista.m || vista.a) && navegar(arriba(vista));
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as HTMLElement)?.tagName === "INPUT" || ayudaAbierta()) return;
      if (!seccion.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      subir.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focus: Bbox | null = acuifero?.b ?? estado?.b ?? null;
  const margen: Margen = escritorio
    ? { top: 0, right: 48, bottom: 0, left: abierto ? 424 : 0 }
    : { top: 120, right: 0, bottom: visibleMovil(nivel, window.innerHeight), left: 0 };

  const ruta: { label: string; v: Vista }[] = [{ label: "México", v: { e: null, m: null, a: null } }];
  if (estado) ruta.push({ label: estado.e, v: { e: estado.cve, m: null, a: null } });
  if (acuifero) ruta.push({ label: acuifero.n, v: vista });
  const padre = ruta.length > 1 ? ruta[ruta.length - 2] : null;

  return (
    <section ref={seccion} id="explorar" aria-label="Mapa de acuíferos"
      className="relative h-dvh min-h-[480px] overflow-clip bg-raised">
      <div className="absolute inset-0">
        {d && (
          <AquiferMap vista={vista} focus={focus} margen={margen} estados={idx.est} municipios={idx.mun} acuiferos={idx.acu} onNavigate={navegar} calidad={verCalidad} />
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-ink-2">No pudimos cargar los datos.</p>
              <button onClick={() => { setError(false); setIntento((n) => n + 1); }}
                className="mt-3 min-h-11 cursor-pointer rounded-md border border-ink px-4 hover:bg-surface">Reintentar</button>
            </div>
          </div>
        )}
      </div>

      {/* Columna flotante: buscador + conmutador. El panel de información es PanelMapa (hoja inferior en móvil). */}
      <div className="pointer-events-none absolute inset-3 z-20 flex flex-col gap-2 lg:right-auto lg:w-[400px]">
        <div className="pointer-events-auto flex items-stretch rounded-[10px] bg-surface shadow-[0_6px_24px_rgba(25,23,20,0.14)] ring-1 ring-black/5">
          <Link href="/" aria-label="Volver al inicio de Sinagua" title="Volver al inicio"
            className="grid w-12 shrink-0 place-items-center rounded-l-[10px] border-r border-line text-ink-2 transition-colors hover:bg-raised hover:text-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
          {d ? (
            <SearchBox estados={d.estados} municipios={d.municipios} acuiferos={d.acuiferos} onPick={navegar} flotante />
          ) : (
            <div className="h-12 animate-pulse rounded-r-[10px] bg-surface" aria-hidden />
          )}
          </div>
        </div>

        <Conmutador actual="/mapa" />

        {estado && <InterruptorCalidad activo={verCalidad} onCambio={setVerCalidad} className="lg:hidden" />}

      </div>

      <PanelMapa escritorio={escritorio} abierto={abierto} onAbierto={setAbierto} nivel={nivel} onNivel={setNivel}
        etiqueta="Información de la ubicación" cuerpoRef={cuerpo}
        encabezado={
          <>
            {padre ? (
              <button type="button" onClick={() => navegar(padre.v)}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[14px] font-semibold transition-colors hover:bg-raised">
                <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                <span className="max-w-[9rem] truncate">{padre.label}</span>
              </button>
            ) : (
              <span className="px-2.5 text-[14px] font-semibold">Panorama nacional</span>
            )}
            <span className="min-w-0 flex-1" />
            {ruta.length > 2 && <BotonInicio onClick={() => { navegar(ruta[0].v); setNivel("bajo"); }} />}
          </>
        }>
        {!d ? (
          <Esqueleto />
        ) : acuifero ? (
          <ModuloAcuifero a={acuifero} />
        ) : estado ? (
          <ModuloEstado key={estado.cve} e={estado} acu={idx.acu} onPick={(a) => navegar({ e: estado.cve, m: null, a })} />
        ) : (
          <ModuloNacional estados={d.estados} onPick={(e) => navegar({ e, m: null, a: null })} />
        )}
      </PanelMapa>

      {estado && (
        <div className="absolute top-3 right-16 z-20 max-lg:hidden">
          <InterruptorCalidad activo={verCalidad} onCambio={setVerCalidad} />
        </div>
      )}
      <Leyenda modo={estado ? "estatus" : "territorio"} calidad={!!estado && verCalidad} />
    </section>
  );
}

/* ---------- piezas comunes ---------- */

/** Muestra u oculta las gotas de calidad del agua. */
function InterruptorCalidad({ activo, onCambio, className = "" }: { activo: boolean; onCambio: (v: boolean) => void; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onCambio(!activo)}
      className={`pointer-events-auto inline-flex min-h-11 w-fit cursor-pointer items-center gap-2.5 rounded-full bg-surface py-1.5 pr-2 pl-3.5 text-[14px] font-semibold shadow-[0_6px_24px_rgba(25,23,20,0.14)] ring-1 ring-black/5 ${className}`}>
      <Gota color={SEMAFORO.r.color} />
      Calidad del agua
      <span aria-hidden className={`relative block h-6 w-10 shrink-0 rounded-full transition-colors ${activo ? "bg-ink" : "bg-line-strong"}`}>
        <span className={`absolute top-0.5 left-0.5 block size-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

/** La misma gota que dibuja el mapa, para leyendas y botones. */
function Gota({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 26" className="h-[18px] w-[14px] shrink-0">
      <path d="M10 2C10 2 3 11 3 16.5a7 7 0 0 0 14 0C17 11 10 2 10 2Z" fill={color} stroke="#fff" strokeWidth="2.2" />
      <path d="M10 2C10 2 3 11 3 16.5a7 7 0 0 0 14 0C17 11 10 2 10 2Z" fill="none" stroke="rgba(25,23,20,.35)" strokeWidth="0.8" />
    </svg>
  );
}

function Leyenda({ modo, calidad }: { modo: "territorio" | "estatus"; calidad: boolean }) {
  return (
    <LeyendaMapa arriba="top-[128px]">
      {modo === "territorio" ? (
        <>
          <p className="mb-1.5 font-semibold">Territorio sobre acuíferos sobreexplotados</p>
          <div className="flex w-full min-w-40">
            {RAMPA.map((r) => (
              <div key={r.desde} className="min-w-10 flex-1">
                <div className="h-2.5 border-r-2 border-surface" style={{ background: r.color }} />
                <span className="num mt-1 block text-ink-3">{r.desde}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mb-1.5 font-semibold">Cada burbuja es un acuífero</p>
          <ul className="space-y-1">
            {ORDEN.map((k) => (
              <li key={k} className="flex items-center gap-2 text-ink-2">
                <Burbuja color={ESTATUS[k].color} />
                {ESTATUS[k].label}
              </li>
            ))}
          </ul>
          {calidad && (
            <>
              <p className="mt-3 mb-1.5 font-semibold">Cada gota es un sitio donde se mide el agua</p>
              <ul className="space-y-1">
                {(["r", "a", "v"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2 text-ink-2">
                    <Gota color={SEMAFORO[k].color} />
                    {SEMAFORO[k].label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </LeyendaMapa>
  );
}

const BarraPct = ({ pct }: { pct: number }) => (
  <span aria-hidden className="h-1.5 w-14 shrink-0 rounded-full bg-raised">
    <span className="block h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: colorPct(pct) }} />
  </span>
);

/** Qué es un acuífero sobreexplotado y cómo leer el semáforo. */
function AyudaAcuiferos() {
  return (
    <Ayuda titulo="Cómo leer este mapa">
      <p>
        Un <strong>acuífero</strong> es agua guardada bajo tierra. Cada año le <strong>entra</strong> agua de lluvia que se filtra al
        subsuelo, y CONAGUA da <strong>permisos para sacar</strong> agua de él (para ciudades, campos o industrias).
      </p>
      <p>
        Decimos que está <strong>sobreexplotado</strong> cuando los permisos para sacar agua superan lo que le entra cada año. Lo que
        falta sale de sus reservas, que tardaron siglos en formarse. (CONAGUA lo llama “déficit”.)
      </p>
      <p>
        Semáforo: <strong>verde</strong> con agua disponible, <strong>amarillo</strong> casi al límite, <strong>naranja</strong>{" "}
        sobreexplotado y <strong>rojo</strong> muy sobreexplotado (se permite sacar 1.5 veces o más lo que entra).
      </p>
      <p>En estados y municipios, el color indica qué parte de su territorio está sobre acuíferos sobreexplotados.</p>
      <p className="text-[13px] text-ink-3">Fuente: CONAGUA, disponibilidad de agua subterránea (DOF, 2023). Límites: INEGI.</p>
    </Ayuda>
  );
}

/** Los acuíferos se actualizan con cada publicación de CONAGUA en el DOF (no cada semana). */
const DATO_ACUIFEROS = `Datos oficiales de ${resumen.anio}`;

/* ---------- quién usa el agua y calidad (se cargan al abrir la ficha) ---------- */

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
type CalidadGeo = { features: { properties: SitioCalidad }[] };
const calidadEstado = (cve: string) => (calidad.estados as unknown as Record<string, { superficie?: ResumenCalidad; pozo?: ResumenCalidad }>)[cve] ?? {};

function resumir(sitios: SitioCalidad[]) {
  const de = (t: SitioCalidad["t"]): ResumenCalidad | undefined => {
    const l = sitios.filter((s) => s.t === t);
    if (!l.length) return undefined;
    const q = new Map<string, number>();
    for (const s of l) for (const x of s.q ? s.q.split(", ") : []) q.set(x, (q.get(x) ?? 0) + 1);
    return { n: l.length, r: l.filter((s) => s.s === "r").length, a: l.filter((s) => s.s === "a").length, v: l.filter((s) => s.s === "v").length,
      q: [...q].sort((a, b) => b[1] - a[1]) };
  };
  return { sup: de("superficie"), pozo: de("pozo") };
}

function useSitios(filtro: ((s: SitioCalidad) => boolean) | null) {
  const geo = useJson<CalidadGeo>(filtro ? "/data/calidad.geojson" : null);
  return useMemo(() => (geo && filtro ? geo.features.map((f) => f.properties).filter(filtro) : null), [geo, filtro]);
}

/* ---------- módulos por nivel ---------- */

function ModuloNacional({ estados, onPick }: { estados: Estado[]; onPick: (cve: string) => void }) {
  const [todos, setTodos] = useState(false);
  const orden = [...estados].sort((a, b) => b.pct - a.pct);
  const km2 = estados.reduce((s, e) => s + e.km2, 0);
  const pct = estados.reduce((s, e) => s + (e.km2 * e.pct) / 100, 0) / km2 * 100;
  return (
    <div className="pb-4">
      <Cabeza dato={DATO_ACUIFEROS} titulo="México" ayuda={<AyudaAcuiferos />} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(pct, 0)}%`} texto="del territorio está sobre acuíferos sobreexplotados" tono="var(--s-critico)" />
        <Cifra valor={String(resumen.deficit)} texto={`de ${resumen.total} acuíferos: se permite sacar más agua de la que les entra`} />
      </div>
      <Pista>Toca un estado en el mapa para ver sus municipios.</Pista>
      <Seccion titulo="Estados más expuestos" accion={<span className="text-[12px] text-ink-3">% del territorio</span>}>
        <ol>
          {(todos ? orden : orden.slice(0, 6)).map((e) => (
            <Fila key={e.cve} onClick={() => onPick(e.cve)} inicio={<BarraPct pct={e.pct} />} nombre={e.e} valor={`${fmt(e.pct, 0)}%`} />
          ))}
        </ol>
        <VerMas abierto={todos} total={orden.length} onClick={() => setTodos((x) => !x)} />
      </Seccion>
    </div>
  );
}

function ModuloEstado({ e, acu, onPick }: { e: Estado; acu: Map<string, Acuifero>; onPick: (a: string) => void }) {
  const [todos, setTodos] = useState(false);
  const items = e.a.map((c) => acu.get(c)!).filter(Boolean).sort((x, y) => x.dma - y.dma);
  const visibles = todos ? items : items.slice(0, 6);
  const usos = useJson<UsosEstado>(`/data/usos/${e.cve}.json`);
  const cal = calidadEstado(e.cve);

  return (
    <div className="pb-4">
      <Cabeza dato={DATO_ACUIFEROS} sobre="Estado" titulo={e.e} ayuda={<AyudaAcuiferos />} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(e.pct, 0)}%`} texto="de su territorio sobre acuíferos sobreexplotados" tono={e.pct >= 50 ? "var(--s-critico)" : undefined} />
        <Cifra valor={`${e.deficit} de ${e.total}`} texto="acuíferos sobreexplotados" />
      </div>
      <Seccion titulo={`Sus ${items.length} acuíferos`} accion={<span className="text-[12px] whitespace-nowrap text-ink-3">falta (−) · millones de m³</span>}>
        <ul>
          {visibles.map((a) => (
            <Fila key={a.c} onClick={() => onPick(a.c)} inicio={<Burbuja color={ESTATUS[a.s].color} />}
              nombre={a.n} sub={ESTATUS[a.s].label} valor={`${a.dma > 0 ? "+" : ""}${fmt(a.dma, 1)}`}
              valorTono={a.dma < 0 ? "var(--s-critico)" : undefined} />
          ))}
        </ul>
        {items.length > 6 && <VerMas abierto={todos} total={items.length} onClick={() => setTodos((x) => !x)} />}
      </Seccion>
      <BloqueUsos u={usos ? usos.e : undefined} lugar={e.e} compartir={{ ruta: `/compartir/usos-estado/${e.slug}`, titulo: `¿Quién se lleva el agua en ${e.e}? — Sinagua` }} />
      <BloqueCalidad sup={cal.superficie} pozo={cal.pozo} />
      <div className="px-6 pt-4">
        <BotonCompartir ruta={`/compartir/estado/${e.slug}`} titulo={`${e.e} — Sinagua`} className="w-full"
          texto={`El ${fmt(e.pct, 0)}% de ${e.e} está sobre acuíferos sobreexplotados.`} />
      </div>
    </div>
  );
}

function ModuloAcuifero({ a }: { a: Acuifero }) {
  const renovable = Math.max(0, a.r - a.dnc);
  const escala = Math.max(renovable, a.veas, 0.001);
  const st = ESTATUS[a.s];
  const usos = useJson<Record<string, UsoLugar>>("/data/usos_acuiferos.json");
  const nombre = sinAcentos(a.n);
  const filtro = useMemo(() => (s: SitioCalidad) => s.t === "pozo" && sinAcentos(s.cuerpo) === nombre, [nombre]);
  const sitios = useSitios(filtro);
  const cal = sitios && sitios.length ? resumir(sitios) : null;

  return (
    <div className="pb-5">
      <Cabeza dato={DATO_ACUIFEROS} sobre={`Acuífero ${a.c}`} titulo={a.n}
        ayuda={<AyudaAcuiferos />}>
        <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-raised py-1 pr-3 pl-1.5 text-[13px] font-semibold">
          <Burbuja color={st.color} grande />
          {st.label}
        </p>
      </Cabeza>

      <p className="mt-5 px-6 font-serif text-[1.3rem] leading-snug text-balance">{fraseLitros(a)}</p>

      <dl className="mt-6 space-y-4 px-6">
        <Medida label="Agua que le entra cada año" valor={renovable} escala={escala} color="var(--agua)" />
        <Medida label="Agua que se permite sacar" valor={a.veas} escala={escala} color={a.dma < 0 ? st.color : "var(--s-limite)"} />
      </dl>

      <div className="mx-6 mt-6 rounded-lg bg-raised p-4">
        <p className="text-[13px] font-medium text-ink-2">
          {a.dma < 0 ? "Cada año faltan" : a.dma > 0 ? "Cada año sobran" : "Cada año"}
        </p>
        {a.dma !== 0 ? (
          <>
            <p className={`num font-serif text-[2rem] leading-tight font-semibold ${a.dma < 0 ? "text-critico" : ""}`}>
              {fmt(albercas(a.dma), 0)} <span className="font-sans text-base font-medium text-ink-2">albercas olímpicas</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-2">
              {volumen(a.dma)}
              {a.dma < 0 ? ", que salen de sus reservas." : " que aún se podrían repartir."}
            </p>
          </>
        ) : (
          <p className="font-serif text-xl font-semibold">No queda agua para dar nuevos permisos.</p>
        )}
      </div>

      <Seccion titulo="Cómo ha cambiado">
        <HistoryChart h={a.h} />
        <p className="mt-1 text-[12px] text-ink-3">Cada punto es una revisión oficial de CONAGUA.</p>
      </Seccion>
      <BloqueUsos u={usos ? (usos[a.c] ?? null) : undefined} lugar={`el acuífero ${a.n}`} />
      {cal && <BloqueCalidad pozo={cal.pozo} sitios={sitios ?? undefined} />}

      <div className="mt-5 grid grid-cols-2 gap-2 px-6">
        <BotonCompartir ruta={`/compartir/acuifero/${a.c}`} titulo={`Acuífero ${a.n} — Sinagua`}
          texto={`Acuífero ${a.n}: ${st.label.toLowerCase()}. ${fraseLitros(a)}`} />
        <a href={a.pdf} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-line-strong px-3 text-[14px] font-semibold hover:bg-raised">
          Estudio oficial
          <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </a>
      </div>
      <details className="mx-6 mt-5 text-[13px] text-ink-2">
        <summary className="min-h-10 cursor-pointer py-2 font-semibold text-ink">Datos técnicos de CONAGUA</summary>
        <table className="num w-full">
          <tbody className="[&_td]:py-1.5 [&_td:last-child]:text-right [&_td:last-child]:whitespace-nowrap [&_tr]:border-b [&_tr]:border-line">
            <tr><td>Recarga (agua que entra al año)</td><td>{fmt(a.r, 1)}</td></tr>
            <tr><td>Agua que debe seguir llegando a ríos y manantiales</td><td>{fmt(a.dnc, 1)}</td></tr>
            <tr><td>Volumen concesionado (permisos para sacar)</td><td>{fmt(a.veas, 1)}</td></tr>
            <tr><td>Disponibilidad (lo que sobra o falta)</td><td>{fmt(a.dma, 1)}</td></tr>
            {a.ext15 !== null && <tr><td>Extracción estimada en 2015</td><td>{fmt(a.ext15, 1)}</td></tr>}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-ink-3">En millones de m³ al año. Un millón de m³ son mil millones de litros.</p>
      </details>
    </div>
  );
}

function Medida({ label, valor, escala, color }: { label: string; valor: number; escala: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[14px] text-ink-2">{label}</dt>
        <dd className="num shrink-0 text-[14px] font-semibold">{volumen(valor)}</dd>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-raised" aria-hidden>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(valor / escala) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

