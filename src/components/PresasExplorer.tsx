"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fmt, normaliza, type Bbox, type Estado } from "@/lib/acuiferos";
import { fechaCorta, nivel, NIVELES, SIN_DATO, USO_CORTO, type EstadoPresas, type Grupo, type Presa, type PresasResumen } from "@/lib/presas";
import type { Margen } from "./AquiferMap";
import Buscador, { type Opcion } from "./Buscador";
import Conmutador from "./Conmutador";
import PanelMapa, { visibleMovil, type Nivel } from "./PanelMapa";
import type { VistaPresas } from "./PresasMap";
import { AyudaCalidad, useJson } from "./Usos";
import { SEMAFORO, type Semaforo } from "@/lib/usos";
import SerieChart from "./SerieChart";
import { Ayuda, ayudaAbierta, BotonInicio, BotonCompartir, Burbuja, Cabeza, Cifra, Esqueleto, Fila, Pista, Seccion, VerMas } from "./ui";

const PresasMap = dynamic(() => import("./PresasMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-3">Cargando mapa…</div>,
});

type Datos = { presas: Presa[]; resumen: PresasResumen; estados: Estado[] };

/* ---------- la vista vive en el hash: #e=sinaloa&p=HUMSI ---------- */
const NAV = "presas:nav";
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

export default function PresasExplorer() {
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
    Promise.all([get("/data/presas.json"), get("/data/presas_resumen.json"), get("/data/estados.json")])
      .then(([presas, resumen, estados]) => vivo && setD({ presas, resumen, estados }))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [intento]);

  const idx = useMemo(() => ({
    presa: new Map((d?.presas ?? []).map((p) => [p.c, p])),
    resumen: new Map((d?.resumen.estados ?? []).map((e) => [e.cve, e])),
    estado: new Map((d?.estados ?? []).map((e) => [e.cve, e])),
    slug: new Map((d?.estados ?? []).map((e) => [e.slug, e])),
    nombres: new Map((d?.estados ?? []).map((e) => [e.cve, e.e])),
  }), [d]);

  // Vista desde el hash; si solo viene la presa, el estado se deduce de ella.
  const params = new URLSearchParams(hash.slice(1));
  const presa = idx.presa.get(params.get("p") ?? "") ?? null;
  const estado = idx.slug.get(params.get("e") ?? "") ?? (presa ? idx.estado.get(presa.ent) ?? null : null);
  const vista: VistaPresas = useMemo(() => ({ e: estado?.cve ?? null, p: presa?.c ?? null }), [estado, presa]);

  useEffect(() => {
    cuerpo.current?.scrollTo({ top: 0 });
  }, [hash]);

  function navegar(v: VistaPresas) {
    const p = new URLSearchParams();
    if (v.e) p.set("e", idx.estado.get(v.e)?.slug ?? v.e);
    if (v.p) p.set("p", v.p);
    const h = p.toString() ? `#${p}` : "";
    if (h !== window.location.hash) {
      window.history.pushState(null, "", `${window.location.pathname}${h}`);
      window.dispatchEvent(new Event(NAV));
    }
    setAbierto(true);
    setPosHoja((n) => (n === "bajo" ? "medio" : n));
  }

  // Esc sube un nivel.
  const subir = useRef<() => void>(() => {});
  useEffect(() => {
    subir.current = () => {
      if (vista.p) navegar({ e: vista.e, p: null });
      else if (vista.e) navegar({ e: null, p: null });
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (e.target as HTMLElement)?.tagName !== "INPUT" && !ayudaAbierta()) subir.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const opciones = useMemo<Opcion<VistaPresas>[]>(() => {
    if (!d) return [];
    return [
      ...d.estados.map((e) => {
        const r = idx.resumen.get(e.cve);
        return {
          key: normaliza(e.e), tipo: "Estado", label: e.e,
          sub: r ? `${r.presas} presas · ${fmt(r.pct, 0)}% llenas` : "Sin presas principales",
          valor: { e: e.cve, p: null }, color: r ? nivel(r.pct).color : undefined,
        };
      }),
      ...d.presas.map((p) => ({
        key: normaliza(`${p.n} ${p.of} ${p.rio} ${p.mun}`), tipo: "Presa", label: p.n,
        sub: p.reciente ? `${p.e} · ${fmt(p.pct, 0)}% llena` : `${p.e} · sin dato reciente`,
        valor: { e: p.ent, p: p.c }, color: p.reciente ? nivel(p.pct).color : SIN_DATO,
      })),
    ];
  }, [d, idx]);

  // Igual que en acuíferos: el estado se mantiene a la vista y la presa se marca con un anillo.
  const focus: Bbox | null = estado?.b ?? (presa ? [presa.lon - 1, presa.lat - 1, presa.lon + 1, presa.lat + 1] : null);
  const margen: Margen = escritorio
    ? { top: 0, right: 48, bottom: 0, left: abierto ? 424 : 0 }
    : { top: 120, right: 0, bottom: visibleMovil(posHoja, window.innerHeight), left: 0 };

  const ruta: { label: string; v: VistaPresas }[] = [{ label: "México", v: { e: null, p: null } }];
  if (estado) ruta.push({ label: estado.e, v: { e: estado.cve, p: null } });
  if (presa) ruta.push({ label: presa.n, v: vista });
  const padre = ruta.length > 1 ? ruta[ruta.length - 2] : null;

  return (
    <section aria-label="Mapa de presas" className="relative h-dvh min-h-[480px] overflow-clip bg-raised">
      <div className="absolute inset-0">
        {d && (
          <PresasMap vista={vista} focus={focus} margen={margen} presas={d.presas} estados={idx.resumen} nombres={idx.nombres} onNavigate={navegar} />
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

      <div className="pointer-events-none absolute inset-3 z-20 flex flex-col gap-2 lg:right-auto lg:w-[400px]">
        <div className="pointer-events-auto flex items-stretch rounded-[10px] bg-surface shadow-[0_6px_24px_rgba(25,23,20,0.14)] ring-1 ring-black/5">
          <Link href="/" aria-label="Volver al inicio de Sinagua" title="Volver al inicio"
            className="grid w-12 shrink-0 place-items-center rounded-l-[10px] border-r border-line text-ink-2 transition-colors hover:bg-raised hover:text-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <Buscador opciones={opciones} onPick={navegar} flotante etiqueta="Busca un estado o una presa" placeholder="Busca estado, presa o río" />
          </div>
        </div>
        <Conmutador actual="/presas" />

      </div>

      <PanelMapa escritorio={escritorio} abierto={abierto} onAbierto={setAbierto} nivel={posHoja} onNivel={setPosHoja}
        etiqueta="Información de presas" cuerpoRef={cuerpo}
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
        ) : presa ? (
          <ModuloPresa key={presa.c} p={presa} />
        ) : estado ? (
          <ModuloEstado key={estado.cve} estado={estado} r={idx.resumen.get(estado.cve) ?? null}
            presas={d.presas.filter((p) => p.ent === estado.cve)} onPick={(c) => navegar({ e: estado.cve, p: c })} />
        ) : (
          <ModuloNacional d={d} onPick={(e) => navegar({ e, p: null })} />
        )}
      </PanelMapa>

      <Leyenda modo={estado ? "presas" : "estados"} />
    </section>
  );
}

/* ---------- piezas ---------- */

function Leyenda({ modo }: { modo: "estados" | "presas" }) {
  return (
    <div className="pointer-events-none absolute right-3 bottom-9 z-10 rounded-lg bg-surface/95 px-3 py-2.5 text-[12px] shadow-[0_4px_16px_rgba(25,23,20,0.12)] ring-1 ring-black/5 backdrop-blur max-lg:hidden">
      <p className="mb-1.5 font-semibold">{modo === "estados" ? "Qué tan llenas están sus presas" : "Cada burbuja es una presa"}</p>
      <ul className="space-y-1">
        {[...NIVELES].reverse().map((n) => (
          <li key={n.key} className="flex items-center gap-2 text-ink-2">
            {modo === "estados" ? <span className="h-3 w-4 rounded-[2px]" style={{ background: n.color }} /> : <Burbuja color={n.color} />}
            {n.label}
          </li>
        ))}
        {modo === "estados" ? (
          <li className="flex items-center gap-2 text-ink-2">
            <span className="h-3 w-4 rounded-[2px] bg-[#ece8df] ring-1 ring-black/10" />
            Sin presas principales
          </li>
        ) : (
          <li className="flex items-center gap-2 text-ink-2">
            <Burbuja color={SIN_DATO} />
            Sin dato reciente
          </li>
        )}
      </ul>
      {modo === "presas" && <p className="mt-2 border-t border-line pt-1.5 text-ink-3">Tamaño = capacidad</p>}
    </div>
  );
}

const BarraNivel = ({ pct }: { pct: number }) => (
  <span aria-hidden className="h-1.5 w-14 shrink-0 rounded-full bg-raised">
    <span className="block h-full rounded-full" style={{ width: `${Math.max(Math.min(pct, 100), 3)}%`, background: nivel(pct).color }} />
  </span>
);

/* ---------- textos de ayuda (se abren con el botón "?") ---------- */

function AyudaMedicion({ ultima }: { ultima: string }) {
  return (
    <Ayuda titulo="Cómo medimos las presas">
      <p>
        CONAGUA monitorea a diario las <strong>~210 presas principales</strong> del país. El <strong>% de llenado</strong> compara el
        agua que tiene con la que le cabe cuando opera normalmente (lo que los técnicos llaman NAMO).
      </p>
      <p>
        Datos al <strong>{fechaCorta(ultima)}</strong>. Usamos dos fuentes de CONAGUA con las mismas cifras: el monitoreo del SINA
        (1991–2025) y el Sistema de Información Hidrológica, que se actualiza a diario.
      </p>
      <p>
        Cada presa se clasifica en semáforo: <strong>verde</strong> 80% o más, <strong>amarillo</strong> 50–80%,{" "}
        <strong>naranja</strong> 20–50% y <strong>rojo</strong> menos de 20%.
      </p>
      <p className="text-[13px] text-ink-3">
        Descartamos registros imposibles de la fuente (más agua que la capacidad máxima de la presa). Las presas con demasiados
        errores se muestran con aviso y no cuentan en los promedios.
      </p>
    </Ayuda>
  );
}

function AyudaAniosSecos({ g, ciudades, desde, panelDesde }: { g: Grupo; ciudades?: Grupo; desde: number; panelDesde: number }) {
  const peor = g.anual.find((a) => a.y === g.peores[0]);
  const peorCiudades = ciudades?.anual.find((a) => a.y === ciudades.peores[0]);
  return (
    <Ayuda titulo="Cómo leer esta gráfica">
      <p>
        Cada año las presas se llenan con las lluvias del verano y se vacían en la temporada seca. Por eso la línea sube y baja.
      </p>
      <p>
        La línea punteada es un <strong>año seco típico</strong> ({fmt(g.minTipico, 0)}%): el punto más bajo que suelen tocar.
        Cuando la curva baja de ahí, fue un año más seco de lo normal.
      </p>
      <p>
        Los años más secos desde {desde} fueron <strong>{g.peores.slice(0, 4).join(", ")}</strong>
        {peor && <> (el peor, {peor.y}, con {fmt(peor.min, 0)}%)</>}.
        {ciudades && peorCiudades && (
          <> En las presas que abastecen ciudades, los peores fueron <strong>{ciudades.peores.slice(0, 2).join(" y ")}</strong>, con mínimos de {fmt(peorCiudades.min, 0)}%.</>
        )}
      </p>
      <p className="text-[13px] text-ink-3">
        Promedio de {g.presas} presas con datos continuos desde {panelDesde} (les caben {fmt(g.capacidad, 0)} millones de m³), siempre las
        mismas, para que el resultado no cambie porque entren o salgan presas del registro.
      </p>
    </Ayuda>
  );
}

function AyudaPresa({ p }: { p: Presa }) {
  return (
    <Ayuda titulo="Cómo leer esta ficha">
      <p>
        El <strong>% de llenado</strong> compara el agua que tiene con la que le cabe cuando opera normalmente:{" "}
        {fmt(p.act, 0)} de {fmt(p.cap, 0)} millones de m³. Un millón de m³ son mil millones de litros.
      </p>
      {p.normal !== null && (
        <p>
          La marca negra en la barra es <strong>lo normal para esta época del año</strong> ({fmt(p.normal, 0)}%): la mediana de su
          llenado en esta misma semana en todos los años con datos.
        </p>
      )}
      <p>
        Se usa para: <strong>{p.uso.map((u) => USO_CORTO[u] ?? u).join(", ").toLowerCase()}</strong>.
        {p.inicio && <> Opera desde {p.inicio}.</>}
      </p>
      {p.aviso && (
        <p>
          Los registros oficiales de esta presa tienen muchos valores imposibles. Los descartamos y no la incluimos en los promedios.
        </p>
      )}
      <p className="text-[13px] text-ink-3">Fuente: CONAGUA, monitoreo de presas (SINA) y Sistema de Información Hidrológica (SIH).</p>
    </Ayuda>
  );
}

/* ---------- módulos ---------- */

function ModuloNacional({ d, onPick }: { d: Datos; onPick: (cve: string) => void }) {
  const [todos, setTodos] = useState(false);
  const { resumen } = d;
  const g = resumen.grupos.nacional;
  const orden = [...resumen.estados].sort((a, b) => a.pct - b.pct);
  const primero = g.anual[0];
  const recientes = g.peores.filter((y) => y >= 2020);

  return (
    <div className="pb-6">
      <Cabeza dato={`Datos al ${fechaCorta(resumen.ultima)}`} titulo="Presas de México" ayuda={<AyudaMedicion ultima={resumen.ultima} />} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(resumen.actual.pct, 0)}%`} texto="de llenado promedio" tono={nivel(resumen.actual.pct).color} />
        <Cifra valor={String(resumen.actual.bajo20)} texto={`presas casi vacías (menos de 20%)`} tono="var(--s-critico)" />
      </div>
      <Pista>Toca un estado en el mapa para ver sus presas.</Pista>

      <Seccion titulo="Estados con las presas más vacías">
        <ol>
          {(todos ? orden : orden.slice(0, 5)).map((e) => (
            <Fila key={e.cve} onClick={() => onPick(e.cve)} inicio={<BarraNivel pct={e.pct} />}
              nombre={e.e} valor={`${fmt(e.pct, 0)}%`} valorTono={e.pct < 20 ? "var(--s-critico)" : undefined} />
          ))}
        </ol>
        <VerMas abierto={todos} total={orden.length} onClick={() => setTodos((x) => !x)} />
      </Seccion>

      <Seccion titulo="Cómo ha cambiado" ayuda={<AyudaAniosSecos g={g} ciudades={resumen.grupos.AP} desde={primero.y} panelDesde={resumen.panelDesde} />}>
        <SerieChart datos={g.semanal} titulo="% de llenado nacional" max={100} alto={140}
          referencia={{ valor: g.minTipico, label: "año seco típico" }}
          tendencia={Math.abs(g.tMin) >= 2 ? g.lineaMin : undefined} />
        {recientes.length >= 2 && (
          <p className="mt-3 text-[14px] text-ink-2">
            <strong className="font-semibold text-ink">{recientes.length} de los {g.peores.length} años más secos</strong> desde {primero.y} fueron después de 2019.
          </p>
        )}
      </Seccion>
    </div>
  );
}

function ModuloEstado({ estado, r, presas, onPick }: { estado: Estado; r: EstadoPresas | null; presas: Presa[]; onPick: (c: string) => void }) {
  const [todas, setTodas] = useState(false);
  const [serie, setSerie] = useState<[string, number][] | null>(null);
  useEffect(() => {
    if (!r?.serie) return;
    let vivo = true;
    fetch(`/data/presas_estado/${estado.cve}.json`)
      .then((x) => x.json())
      .then((s) => vivo && setSerie(s))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [estado.cve, r?.serie]);

  if (!r) {
    return (
      <div className="pb-6">
        <Cabeza sobre="Estado" titulo={estado.e} />
        <p className="mt-5 px-6 font-serif text-[1.25rem] leading-snug">No tiene presas en el monitoreo de las principales del país.</p>
        <p className="mt-2 px-6 text-[14px] text-ink-2">Gran parte de su agua viene del subsuelo.</p>
        <div className="px-6 pt-5">
          <Link href={`/mapa#e=${estado.slug}`} className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-[14px] font-semibold text-white hover:opacity-85">
            Ver sus acuíferos
          </Link>
        </div>
      </div>
    );
  }

  const orden = [...presas].filter((p) => !p.aviso && p.reciente).sort((a, b) => a.pct - b.pct);
  const viejas = presas.filter((p) => !p.reciente);
  const ultima = presas.reduce((u, p) => (p.fecha > u ? p.fecha : u), "");
  return (
    <div className="pb-6">
      <Cabeza dato={ultima ? `Datos al ${fechaCorta(ultima)}` : undefined} sobre="Estado" titulo={estado.e} />
      <div className="mt-6 grid grid-cols-2 gap-5 px-6">
        <Cifra valor={`${fmt(r.pct, 0)}%`} texto="de llenado de sus presas" tono={nivel(r.pct).color} />
        <Cifra valor={`${r.bajo20} de ${r.presas}`} texto="casi vacías (menos de 20%)" tono={r.bajo20 ? "var(--s-critico)" : undefined} />
      </div>
      <Pista>Toca una burbuja para ver la historia de esa presa.</Pista>

      <Seccion titulo={orden.length === 1 ? "Su presa" : `Sus ${orden.length} presas`}>
        <ul>
          {(todas ? orden : orden.slice(0, 5)).map((p) => (
            <Fila key={p.c} onClick={() => onPick(p.c)} inicio={<Burbuja color={nivel(p.pct).color} grande />}
              nombre={p.n} valor={`${fmt(p.pct, 0)}%`} valorTono={p.pct < 20 ? "var(--s-critico)" : undefined} />
          ))}
        </ul>
        {orden.length > 5 && <VerMas abierto={todas} total={orden.length} onClick={() => setTodas((x) => !x)} />}
        {viejas.length > 0 && (
          <p className="mt-2 mb-1 text-[13px] text-ink-3">
            {viejas.length === 1 ? "1 presa no tiene" : `${viejas.length} presas no tienen`} dato reciente (en gris en el mapa).
          </p>
        )}
      </Seccion>

      {r.serie > 0 && (
        <Seccion titulo="Cómo ha cambiado">
          {serie ? (
            <SerieChart datos={serie} titulo="% de llenado" max={100} alto={130} />
          ) : (
            <div className="h-[160px] animate-pulse rounded bg-raised" aria-hidden />
          )}
        </Seccion>
      )}
      <div className="px-6 pt-5">
        <BotonCompartir ruta={`/compartir/presas-estado/${estado.slug}`} titulo={`Presas de ${estado.e} — Sinagua`} className="w-full"
          texto={`Las presas de ${estado.e} están al ${fmt(r.pct, 0)}%.`} />
      </div>
    </div>
  );
}

function ModuloPresa({ p }: { p: Presa }) {
  const [serie, setSerie] = useState<[string, number][] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch(`/data/presas/${p.c}.json`)
      .then((r) => r.json())
      .then((d: [string, number][]) => vivo && setSerie(d))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [p.c]);

  const calidad = useJson<Record<string, { s: Semaforo; q: string[]; y: number }>>("/data/calidad_presas.json");
  const cal = calidad?.[p.c];
  const n = nivel(p.pct);
  const minimo = serie?.reduce((m, d) => (d[1] < m[1] ? d : m));
  const diferencia = p.normal !== null ? p.pct - p.normal : null;

  return (
    <div className="pb-6">
      <Cabeza dato={`Datos al ${fechaCorta(p.fecha)}`} sobre={`${p.mun}, ${p.e}`} titulo={p.n} ayuda={<AyudaPresa p={p} />} />

      {!p.reciente && (
        <p className="mx-6 mt-5 rounded-md bg-raised px-3 py-2 text-[13px] text-ink-2">
          Sin dato reciente: CONAGUA no ha reportado esta presa desde el {fechaCorta(p.fecha)}.
        </p>
      )}
      <div className="mt-6 px-6">
        <Cifra valor={`${fmt(p.pct, 0)}%`} texto={`llena al ${fechaCorta(p.fecha)}`} tono={p.reciente ? n.color : SIN_DATO} />
        <div className="relative mt-5 h-3 rounded-full bg-raised" aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${Math.min(p.pct, 100)}%`, background: n.color }} />
          {p.normal !== null && <div className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-ink" style={{ left: `${Math.min(p.normal, 100)}%` }} />}
        </div>
        {diferencia !== null && (
          <p className="mt-3 text-[14px] text-ink-2">
            {Math.abs(diferencia) < 5
              ? `Está como siempre en esta época del año (normalmente al ${fmt(p.normal!, 0)}%).`
              : `${diferencia < 0 ? "Más vacía" : "Más llena"} de lo normal para esta época: normalmente está al ${fmt(p.normal!, 0)}%.`}
          </p>
        )}
      </div>

      {calidad && (
        <div className="mx-6 mt-6 flex items-center gap-3 rounded-lg bg-raised px-4 py-3 text-[14px]">
          {cal ? (
            <>
              <Burbuja color={SEMAFORO[cal.s].color} grande />
              <span className="min-w-0 flex-1">
                Agua <strong className="font-semibold">{SEMAFORO[cal.s].label.toLowerCase()}</strong>
                {cal.q.length > 0 && <span className="text-ink-2">: {cal.q.join(", ")}</span>}
                <span className="text-ink-3"> · {cal.y}</span>
              </span>
              <AyudaCalidad />
            </>
          ) : (
            <span className="text-ink-2">CONAGUA no mide la calidad de su agua.</span>
          )}
        </div>
      )}

      <Seccion titulo={`Su historia desde ${p.desde}`}>
        {serie ? (
          <>
            <SerieChart datos={serie} titulo="% de llenado" max={Math.max(100, ...serie.map((x) => x[1]))} alto={140} />
            {minimo && (
              <p className="mt-3 text-[14px] text-ink-2">
                Su punto más bajo: <strong className="font-semibold text-ink">{fmt(minimo[1], 0)}%</strong> en {fechaCorta(minimo[0]).replace(/^\d+ /, "")}.
              </p>
            )}
          </>
        ) : (
          <div className="h-[170px] animate-pulse rounded bg-raised" aria-hidden />
        )}
      </Seccion>
      {p.aviso && (
        <p className="mx-6 mt-5 rounded-md bg-raised px-3 py-2 text-[13px] text-ink-2">Datos de origen con errores; ver “?”.</p>
      )}
      <div className="px-6 pt-5">
        <BotonCompartir ruta={`/compartir/presa/${p.c}`} titulo={`Presa ${p.n} — Sinagua`} className="w-full"
          texto={`La presa ${p.n} (${p.e}) está al ${fmt(p.pct, 0)}% al ${fechaCorta(p.fecha)}.`} />
      </div>
    </div>
  );
}

