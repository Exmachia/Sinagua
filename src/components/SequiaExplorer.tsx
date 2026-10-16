"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fmt, normaliza, type Bbox, type Estado, type Municipio } from "@/lib/acuiferos";
import { fechaCorta } from "@/lib/presas";
import { CATEGORIAS, duracion, enSequia, type DatosSequia, type SequiaMun } from "@/lib/sequia";
import type { Margen } from "./AquiferMap";
import Buscador, { type Opcion } from "./Buscador";
import Conmutador from "./Conmutador";
import PanelMapa, { visibleMovil, type Nivel } from "./PanelMapa";
import type { VistaSequia } from "./SequiaMap";
import { Ayuda, ayudaAbierta, BotonInicio, BotonCompartir, Cabeza, Cifra, Esqueleto, Fila, Pista, Seccion, VerMas } from "./ui";

const SequiaMap = dynamic(() => import("./SequiaMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-3">Cargando mapa…</div>,
});

type Datos = { sequia: DatosSequia; municipios: Municipio[]; estados: Estado[] };

const NAV = "sequia:nav";
const suscribir = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  window.addEventListener(NAV, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
    window.removeEventListener(NAV, cb);
  };
};
const ESCRITORIO = "(min-width: 1024px)";
const suscribirMedia = (cb: () => void) => {
  const mq = window.matchMedia(ESCRITORIO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Población y municipios en sequía (D1–D4) de una lista de municipios. */
function resumir(lista: [string, SequiaMun][]) {
  let pob = 0, pobSeq = 0, mun = 0;
  const porCat = [0, 0, 0, 0, 0, 0];
  for (const [, s] of lista) {
    pob += s.p;
    porCat[s.c] += s.p; // por personas, igual que la cifra principal
    if (enSequia(s.c)) {
      pobSeq += s.p;
      mun++;
    }
  }
  return { pob, pobSeq, pct: pob ? (pobSeq / pob) * 100 : 0, mun, total: lista.length, porCat };
}

export default function SequiaExplorer() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [abierto, setAbierto] = useState(true);
  const [posHoja, setPosHoja] = useState<Nivel>("medio");
  const cuerpo = useRef<HTMLDivElement>(null);
  const hash = useSyncExternalStore(suscribir, () => window.location.hash, () => "");
  const escritorio = useSyncExternalStore(suscribirMedia, () => window.matchMedia(ESCRITORIO).matches, () => true);

  useEffect(() => {
    let vivo = true;
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(u))));
    Promise.all([get("/data/sequia_mun.json"), get("/data/municipios.json"), get("/data/estados.json")])
      .then(([sequia, municipios, estados]) => vivo && setD({ sequia, municipios, estados }))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [intento]);

  const idx = useMemo(() => ({
    mun: new Map((d?.municipios ?? []).map((m) => [m.g, m])),
    estado: new Map((d?.estados ?? []).map((e) => [e.cve, e])),
    slug: new Map((d?.estados ?? []).map((e) => [e.slug, e])),
    nombres: new Map((d?.municipios ?? []).map((m) => [m.g, m.n])),
  }), [d]);

  const params = new URLSearchParams(hash.slice(1));
  const municipio = idx.mun.get(params.get("m") ?? "") ?? null;
  const estado = idx.slug.get(params.get("e") ?? "") ?? (municipio ? idx.estado.get(municipio.ent) ?? null : null);
  const vista: VistaSequia = useMemo(() => ({ e: estado?.cve ?? null, m: municipio?.g ?? null }), [estado, municipio]);

  useEffect(() => {
    cuerpo.current?.scrollTo({ top: 0 });
  }, [hash]);

  function navegar(v: VistaSequia) {
    const p = new URLSearchParams();
    if (v.e) p.set("e", idx.estado.get(v.e)?.slug ?? v.e);
    if (v.m) p.set("m", v.m);
    const h = p.toString() ? `#${p}` : "";
    if (h !== window.location.hash) {
      window.history.pushState(null, "", `${window.location.pathname}${h}`);
      window.dispatchEvent(new Event(NAV));
    }
    setAbierto(true);
    setPosHoja((n) => (n === "bajo" ? "medio" : n));
  }

  const subir = useRef<() => void>(() => {});
  useEffect(() => {
    subir.current = () => {
      if (vista.m) navegar({ e: vista.e, m: null });
      else if (vista.e) navegar({ e: null, m: null });
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (e.target as HTMLElement)?.tagName !== "INPUT" && !ayudaAbierta()) subir.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const opciones = useMemo<Opcion<VistaSequia>[]>(() => {
    if (!d) return [];
    return [
      ...d.estados.map((e) => {
        const r = resumir(Object.entries(d.sequia.m).filter(([g]) => g.startsWith(e.cve)));
        return { key: normaliza(e.e), tipo: "Estado", label: e.e, sub: `${fmt(r.pct, 0)}% de su gente en sequía`, valor: { e: e.cve, m: null } };
      }),
      ...d.municipios.map((m) => {
        const s = d.sequia.m[m.g];
        return {
          key: normaliza(`${m.n} ${idx.estado.get(m.ent)?.e ?? ""}`), tipo: "Municipio", label: m.n,
          sub: `${idx.estado.get(m.ent)?.e ?? ""}${s ? ` · ${CATEGORIAS[s.c].label.toLowerCase()}` : ""}`,
          valor: { e: m.ent, m: m.g }, color: s ? CATEGORIAS[s.c].color : undefined,
        };
      }),
    ];
  }, [d, idx]);

  const focus: Bbox | null = municipio?.b ?? estado?.b ?? null;
  const margen: Margen = escritorio
    ? { top: 0, right: 48, bottom: 0, left: abierto ? 424 : 0 }
    : { top: 120, right: 0, bottom: visibleMovil(posHoja, window.innerHeight), left: 0 };

  const ruta: { label: string; v: VistaSequia }[] = [{ label: "México", v: { e: null, m: null } }];
  if (estado) ruta.push({ label: estado.e, v: { e: estado.cve, m: null } });
  if (municipio) ruta.push({ label: municipio.n, v: vista });
  const padre = ruta.length > 1 ? ruta[ruta.length - 2] : null;

  return (
    <section aria-label="Mapa de sequía" className="relative h-dvh min-h-[480px] overflow-clip bg-raised">
      <div className="absolute inset-0">
        {d && <SequiaMap vista={vista} focus={focus} margen={margen} datos={d.sequia} nombres={idx.nombres} onNavigate={navegar} />}
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

      <div className="pointer-events-none absolute inset-3 z-20 flex flex-col gap-2 lg:right-auto lg:w-[400px]">
        <div className="pointer-events-auto flex items-stretch rounded-[10px] bg-surface shadow-[0_6px_24px_rgba(25,23,20,0.14)] ring-1 ring-black/5">
          <Link href="/" aria-label="Volver al inicio de Sinagua" title="Volver al inicio"
            className="grid w-12 shrink-0 place-items-center rounded-l-[10px] border-r border-line text-ink-2 transition-colors hover:bg-raised hover:text-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <Buscador opciones={opciones} onPick={navegar} flotante etiqueta="Busca un estado o un municipio" placeholder="Busca tu municipio o estado" />
          </div>
        </div>
        <Conmutador actual="/sequia" />
      </div>

      <PanelMapa escritorio={escritorio} abierto={abierto} onAbierto={setAbierto} nivel={posHoja} onNivel={setPosHoja}
        etiqueta="Información de sequía" cuerpoRef={cuerpo}
        encabezado={
          <>
            {padre ? (
              <button type="button" onClick={() => navegar(padre.v)}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[14px] font-semibold transition-colors hover:bg-raised">
                <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                <span className="max-w-[10rem] truncate">{padre.label}</span>
              </button>
            ) : (
              <span className="px-2.5 text-[14px] font-semibold">Panorama nacional</span>
            )}
            <span className="min-w-0 flex-1" />
            {ruta.length > 2 && <BotonInicio onClick={() => { navegar(ruta[0].v); setPosHoja("bajo"); }} />}
          </>
        }>
        {!d ? (
          <Esqueleto />
        ) : municipio ? (
          <ModuloMunicipio key={municipio.g} m={municipio} estado={estado} s={d.sequia.m[municipio.g]} desde={d.sequia.desde} fecha={d.sequia.f} />
        ) : estado ? (
          <ModuloEstado key={estado.cve} estado={estado} datos={d} onPick={(m) => navegar({ e: estado.cve, m })} />
        ) : (
          <ModuloNacional datos={d} onPick={(e) => navegar({ e, m: null })} />
        )}
      </PanelMapa>

      <Leyenda />
    </section>
  );
}

/* ---------- piezas ---------- */

function Leyenda() {
  return (
    <div className="pointer-events-none absolute right-3 bottom-9 z-10 rounded-lg bg-surface/95 px-3 py-2.5 text-[12px] shadow-[0_4px_16px_rgba(25,23,20,0.12)] ring-1 ring-black/5 backdrop-blur max-lg:hidden">
      <p className="mb-1.5 font-semibold">Sequía en cada municipio</p>
      <ul className="space-y-1">
        {[...CATEGORIAS].reverse().map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-ink-2">
            <span className="h-3 w-4 rounded-[2px] ring-1 ring-black/10" style={{ background: c.color }} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AyudaSequia() {
  return (
    <Ayuda titulo="Cómo se mide la sequía">
      <p>
        Cada quincena, el Servicio Meteorológico Nacional (CONAGUA) revisa lluvia, ríos, presas, humedad del suelo y vegetación, y
        le pone a cada municipio una categoría:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Anormalmente seco:</strong> todavía no es sequía, pero va para allá (o apenas sale de una).</li>
        <li><strong>Moderada:</strong> daños en cultivos y pastos; bajan ríos y presas.</li>
        <li><strong>Severa:</strong> pérdidas de cosechas, escasez de agua, restricciones.</li>
        <li><strong>Extrema y excepcional:</strong> pérdidas grandes y escasez generalizada de agua.</li>
      </ul>
      <p>Contamos como “en sequía” de moderada para arriba. La población es del Censo 2020.</p>
    </Ayuda>
  );
}

/** Barra apilada: cuánta gente vive en cada categoría. */
function BarraCategorias({ porCat }: { porCat: number[] }) {
  const total = porCat.reduce((a, b) => a + b, 0);
  return (
    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
      aria-label={CATEGORIAS.map((c, i) => `${c.label}: ${Math.round((porCat[i] / total) * 100)}% de la gente`).join(", ")}>
      {CATEGORIAS.map((c, i) => porCat[i] > 0 && (
        <div key={c.label} style={{ width: `${(porCat[i] / total) * 100}%`, background: c.color, minWidth: 3 }} />
      ))}
    </div>
  );
}

const Cuadro = ({ c }: { c: number }) => (
  <span aria-hidden className="size-3.5 shrink-0 rounded-[3px] ring-1 ring-black/10" style={{ background: CATEGORIAS[c].color }} />
);

function ModuloNacional({ datos, onPick }: { datos: Datos; onPick: (cve: string) => void }) {
  const [todos, setTodos] = useState(false);
  const lista = Object.entries(datos.sequia.m);
  const r = resumir(lista);
  const estados = datos.estados
    .map((e) => ({ e, r: resumir(lista.filter(([g]) => g.startsWith(e.cve))) }))
    .sort((a, b) => b.r.pct - a.r.pct || b.r.mun - a.r.mun);
  return (
    <div className="pb-4">
      <Cabeza dato={`Datos al ${fechaCorta(datos.sequia.f)}`} titulo="México" ayuda={<AyudaSequia />} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(r.pobSeq / 1e6, 1)} M`} texto="de personas viven en un municipio con sequía" tono={CATEGORIAS[3].color} />
        <Cifra valor={fmt(r.mun, 0)} texto={`de ${fmt(r.total, 0)} municipios, en sequía`} />
      </div>
      <div className="mt-6 px-6"><BarraCategorias porCat={r.porCat} /></div>
      <Pista>Toca tu municipio en el mapa.</Pista>
      <Seccion titulo="Estados con más gente en sequía" accion={<span className="text-[12px] text-ink-3">% de su población</span>}>
        <ol>
          {(todos ? estados : estados.slice(0, 6)).map(({ e, r }) => (
            <Fila key={e.cve} onClick={() => onPick(e.cve)} nombre={e.e}
              inicio={<span className="relative h-2 w-12 shrink-0 rounded-full bg-raised"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.pct}%`, background: CATEGORIAS[3].color }} /></span>}
              valor={`${fmt(r.pct, 0)}%`} />
          ))}
        </ol>
        <VerMas abierto={todos} total={estados.length} onClick={() => setTodos((x) => !x)} />
      </Seccion>
    </div>
  );
}

function ModuloEstado({ estado, datos, onPick }: { estado: Estado; datos: Datos; onPick: (g: string) => void }) {
  const [todos, setTodos] = useState(false);
  const lista = Object.entries(datos.sequia.m).filter(([g]) => g.startsWith(estado.cve));
  const r = resumir(lista);
  const nombres = new Map(datos.municipios.map((m) => [m.g, m.n]));
  const conSequia = lista.filter(([, s]) => s.c >= 1).sort((a, b) => b[1].c - a[1].c || b[1].r - a[1].r);
  return (
    <div className="pb-4">
      <Cabeza dato={`Datos al ${fechaCorta(datos.sequia.f)}`} sobre="Estado" titulo={estado.e} ayuda={<AyudaSequia />} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(r.pct, 0)}%`} texto="de su gente vive en un municipio con sequía" tono={r.pct > 0 ? CATEGORIAS[3].color : undefined} />
        <Cifra valor={`${r.mun} de ${r.total}`} texto="municipios en sequía" />
      </div>
      <div className="mt-6 px-6"><BarraCategorias porCat={r.porCat} /></div>
      {conSequia.length > 0 ? (
        <Seccion titulo="Los más secos hoy">
          <ul>
            {(todos ? conSequia : conSequia.slice(0, 6)).map(([g, s]) => (
              <Fila key={g} onClick={() => onPick(g)} inicio={<Cuadro c={s.c} />} nombre={nombres.get(g) ?? g}
                sub={enSequia(s.c) ? `${CATEGORIAS[s.c].label} · lleva ${duracion(s.r)}` : CATEGORIAS[s.c].label} valor="" />
            ))}
          </ul>
          {conSequia.length > 6 && <VerMas abierto={todos} total={conSequia.length} onClick={() => setTodos((x) => !x)} />}
        </Seccion>
      ) : (
        <p className="mx-6 mt-6 font-serif text-xl">Ningún municipio está en sequía en esta quincena.</p>
      )}
      <div className="px-6 pt-5">
        <BotonCompartir ruta={`/compartir/sequia-estado/${estado.slug}`} titulo={`Sequía en ${estado.e} — Sinagua`} className="w-full"
          texto={`${fmt(r.pct, 0)}% de la gente de ${estado.e} vive en un municipio con sequía.`} />
      </div>
    </div>
  );
}

function ModuloMunicipio({ m, estado, s, desde, fecha }: { m: Municipio; estado: Estado | null; s: SequiaMun | undefined; desde: string; fecha: string }) {
  if (!s) {
    return (
      <div className="pb-4">
        <Cabeza sobre={estado ? `Municipio de ${estado.e}` : "Municipio"} titulo={m.n} />
        <p className="mx-6 mt-6 text-ink-2">El Monitor de Sequía no tiene datos de este municipio.</p>
      </div>
    );
  }
  const cat = CATEGORIAS[s.c];
  const celdas = s.h.split("").map(Number);
  // Si hoy no hay sequía: ¿la hubo en estos 2 años, y qué tan fuerte?
  const ultima = celdas.findLastIndex((c) => enSequia(c));
  const peor = Math.max(...celdas);
  return (
    <div className="pb-5">
      <Cabeza dato={`Datos al ${fechaCorta(fecha)}`} sobre={estado ? `Municipio de ${estado.e}` : "Municipio"} titulo={m.n} ayuda={<AyudaSequia />}>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-raised py-1 pr-3 pl-1.5 text-[14px] font-semibold">
          <Cuadro c={s.c} />
          {cat.label}
        </p>
      </Cabeza>
      <p className="mt-5 px-6 font-serif text-[1.3rem] leading-snug text-balance">
        {enSequia(s.c)
          ? <>Lleva <strong className="font-semibold">{duracion(s.r)}</strong> seguidos en sequía.</>
          : ultima >= 0
            ? <>Hoy no está en sequía, pero en estos 2 años llegó a <strong className="font-semibold">{CATEGORIAS[peor].label.toLowerCase()}</strong>.</>
            : s.c === 1 ? "Hoy no está en sequía, pero está anormalmente seco." : "Hoy no está en sequía."}
      </p>

      <Seccion titulo="Los últimos 2 años">
        <div className="flex h-8 gap-px overflow-hidden rounded-md" role="img"
          aria-label={`Sequía quincena por quincena desde ${fechaCorta(desde)}`}>
          {celdas.map((c, i) => <div key={i} className="flex-1" style={{ background: CATEGORIAS[c].color }} />)}
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] text-ink-3">
          <span>{fechaCorta(desde).replace(/^\d+ /, "")}</span>
          <span>hoy</span>
        </div>
      </Seccion>
      <div className="mx-6 mt-6 grid grid-cols-2 gap-5">
        <Cifra valor={`${s.t}%`} texto="del tiempo en sequía desde 2003" />
        <Cifra valor={fmt(s.p, 0)} texto="habitantes" />
      </div>
      <div className="px-6 pt-6">
        <BotonCompartir ruta={`/compartir/sequia-municipio/${m.g}`} titulo={`Sequía en ${m.n} — Sinagua`} className="w-full"
          texto={enSequia(s.c) ? `${m.n} lleva ${duracion(s.r)} seguidos en sequía.` : `${m.n} ha pasado ${s.t}% del tiempo en sequía desde 2003.`} />
      </div>
    </div>
  );
}
