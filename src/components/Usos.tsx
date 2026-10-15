"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { GRUPOS_USO, mayor, QUE_ES, SEMAFORO, USO, type ResumenCalidad, type SitioCalidad, type UsoLugar } from "@/lib/usos";
import { Ayuda, Burbuja, Seccion } from "./ui";

/* ---------- datos bajo demanda (con caché entre fichas) ---------- */

const cache = new Map<string, Promise<unknown>>();
export function useJson<T>(url: string | null): T | null {
  const [res, setRes] = useState<{ url: string; datos: T } | null>(null);
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    cache.get(url)!.then((datos) => vivo && setRes({ url, datos: datos as T }));
    return () => {
      vivo = false;
    };
  }, [url]);
  return res && res.url === url ? res.datos : null;
}

/* ---------- ¿Quién se lleva el agua? ---------- */

export function BarraUsos({ u, alto = 14 }: { u: UsoLugar; alto?: number }) {
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height: alto }} role="img"
      aria-label={GRUPOS_USO.map((g, i) => `${USO[g].label}: ${fmt((u.g[i] / u.v) * 100, 0)}%`).join(", ")}>
      {GRUPOS_USO.map((g, i) => u.g[i] > 0 && (
        <div key={g} style={{ width: `${(u.g[i] / u.v) * 100}%`, background: USO[g].color, minWidth: 3 }} />
      ))}
    </div>
  );
}

export function LeyendaUsos({ u }: { u: UsoLugar }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
      {GRUPOS_USO.map((g, i) => {
        const pct = (u.g[i] / u.v) * 100;
        if (pct < 0.5) return null;
        return (
          <li key={g} className="flex items-center gap-2">
            <Burbuja color={USO[g].color} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{USO[g].corto}</span>
            <span className="num font-semibold">{fmt(pct, 0)}%</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AyudaUsos() {
  return (
    <Ayuda titulo="De dónde sale esto">
      <p>
        Del Registro Público de Derechos de Agua (REPDA) de CONAGUA: cada permiso dice para qué es el agua, quién la tiene y
        cuánta puede sacar al año de cada pozo, río o presa.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Es el agua que el permiso <strong>autoriza</strong> sacar, no la que se mide. Lo que realmente se saca puede ser más (pozos sin permiso) o menos.</li>
        <li>No contamos las hidroeléctricas: el agua pasa por sus turbinas y sigue su camino.</li>
        <li>“Varios usos” son permisos que no se limitan a uno solo.</li>
        <li>Solo mostramos nombres de organizaciones (empresas, gobiernos, ejidos, asociaciones). Lo de personas particulares se suma sin nombre.</li>
      </ul>
    </Ayuda>
  );
}

export function BloqueUsos({ u, lugar }: { u: UsoLugar | null | undefined; lugar: string }) {
  const [ver, setVer] = useState(false);
  if (u === undefined) return null; // todavía cargando: no se reserva espacio para no saltar
  if (!u || u.v <= 0) {
    return (
      <Seccion titulo="¿Quién se lleva el agua?">
        <p className="pb-2 text-[14px] text-ink-2">No hay permisos registrados para sacar agua en {lugar}.</p>
      </Seccion>
    );
  }
  const m = mayor(u);
  const pctParticulares = (u.p / u.v) * 100;
  return (
    <Seccion titulo="¿Quién se lleva el agua?" ayuda={<AyudaUsos />}>
      <p className="font-serif text-[1.25rem] leading-snug text-balance">
        {USO[m.grupo].sujeto} <strong className="font-semibold">{m.de100} de cada 100 litros</strong>.
      </p>
      <div className="mt-4"><BarraUsos u={u} /></div>
      <LeyendaUsos u={u} />
      <p className="mt-3 text-[12px] text-ink-3">{fmt(u.n, 0)} permisos · {fmt(u.v, u.v < 10 ? 1 : 0)} millones de m³ al año</p>

      <button type="button" onClick={() => setVer((x) => !x)} aria-expanded={ver}
        className="mt-3 mb-2 flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md px-2 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-raised hover:text-ink">
        ¿Quién tiene los permisos más grandes?
        <svg aria-hidden viewBox="0 0 24 24" className={`size-4 transition-transform ${ver ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {ver && (
        <ol className="mb-3 space-y-2 text-[14px]">
          {u.t.map(([n, v], i) => (
            <li key={n + i} className="flex items-baseline gap-3">
              <span className="num w-4 shrink-0 text-[12px] text-ink-3">{i + 1}</span>
              <span className="min-w-0 flex-1 leading-snug">{n}</span>
              <span className="num shrink-0 font-semibold">{fmt((v / u.v) * 100, (v / u.v) * 100 < 1 ? 1 : 0)}%</span>
            </li>
          ))}
          {u.p > 0 && (
            <li className="flex items-baseline gap-3 border-t border-line pt-2 text-ink-2">
              <span className="w-4 shrink-0" />
              <span className="min-w-0 flex-1">Personas particulares (todas juntas)</span>
              <span className="num shrink-0 font-semibold text-ink">{fmt(pctParticulares, 0)}%</span>
            </li>
          )}
        </ol>
      )}
    </Seccion>
  );
}

/* ---------- ¿Está limpia? ---------- */

export function BarraSemaforo({ r }: { r: ResumenCalidad }) {
  return (
    <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
      {(["r", "a", "v"] as const).map((k) => r[k] > 0 && (
        <div key={k} style={{ width: `${(r[k] / r.n) * 100}%`, background: SEMAFORO[k].color, minWidth: 3 }} />
      ))}
    </div>
  );
}

export function AyudaCalidad() {
  return (
    <Ayuda titulo="Cómo se mide si el agua está limpia">
      <p>
        CONAGUA toma muestras en ríos, lagos, presas, costas y pozos (Red Nacional de Medición de Calidad del Agua) y pone a
        cada sitio un semáforo:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Rojo:</strong> contaminada. En ríos y presas: aguas negras, materia orgánica o sustancias tóxicas. En pozos: no sirve para beber sin tratarla (arsénico, flúor, nitratos, metales, sales o bacterias).</li>
        <li><strong>Amarillo:</strong> con problemas: bacterias de heces, lodo o poco oxígeno.</li>
        <li><strong>Verde:</strong> cumple con todos los indicadores medidos.</li>
      </ul>
      <p>
        Usamos el dato más reciente de cada sitio (2023, o 2021 si no se midió en 2023). Es el agua <strong>en su fuente</strong>,
        no la que sale de tu llave: esa la analiza el organismo de agua de cada ciudad y no hay una base pública nacional con
        esos resultados.
      </p>
    </Ayuda>
  );
}

function FilaCalidad({ titulo, r, rojo }: { titulo: string; r: ResumenCalidad; rojo: string }) {
  return (
    <div className="py-3">
      <p className="text-[14px] text-ink-2">{titulo}</p>
      <p className="mt-0.5 text-[15px]">
        <strong className="num font-semibold">{r.r} de {r.n}</strong> {rojo}
      </p>
      <div className="mt-2"><BarraSemaforo r={r} /></div>
      {r.q.length > 0 && (
        <p className="mt-2 text-[13px] text-ink-2">
          Se encontró: {r.q.slice(0, 3).map(([q]) => QUE_ES[q] ?? q).join(", ")}.
        </p>
      )}
    </div>
  );
}

export function BloqueCalidad({ sup, pozo, sitios }: { sup?: ResumenCalidad; pozo?: ResumenCalidad; sitios?: SitioCalidad[] }) {
  const [ver, setVer] = useState(false);
  if (!sup && !pozo) {
    return (
      <Seccion titulo="¿Está limpia el agua?" ayuda={<AyudaCalidad />}>
        <p className="pb-2 text-[14px] text-ink-2">CONAGUA no tiene sitios de monitoreo aquí.</p>
      </Seccion>
    );
  }
  return (
    <Seccion titulo="¿Está limpia el agua?" ayuda={<AyudaCalidad />}>
      <div className="divide-y divide-line">
        {sup && <FilaCalidad titulo="Ríos, lagos y presas medidos" r={sup} rojo="están contaminados" />}
        {pozo && <FilaCalidad titulo="Pozos medidos" r={pozo} rojo="no sirven para beber sin tratarla" />}
      </div>
      {sitios && sitios.length > 0 && (
        <>
          <button type="button" onClick={() => setVer((x) => !x)} aria-expanded={ver}
            className="mt-1 mb-2 flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md px-2 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-raised hover:text-ink">
            Ver los {sitios.length} sitios
            <svg aria-hidden viewBox="0 0 24 24" className={`size-4 transition-transform ${ver ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {ver && (
            <ul className="mb-3 space-y-2.5 text-[14px]">
              {[...sitios].sort((a, b) => "rav".indexOf(a.s) - "rav".indexOf(b.s)).map((s) => (
                <li key={s.c} className="flex gap-3">
                  <span className="pt-1"><Burbuja color={SEMAFORO[s.s].color} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{s.cuerpo || s.n}</span>
                    <span className="block text-[12px] text-ink-3">
                      {s.t === "pozo" ? "Pozo" : "Agua superficial"} · {SEMAFORO[s.s].label.toLowerCase()}
                      {s.q ? ` (${s.q})` : ""} · {s.y}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="pb-2 text-[12px] text-ink-3">Es el agua en su fuente, no la que sale de tu llave.</p>
    </Seccion>
  );
}
