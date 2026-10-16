"use client";

import { useId, useRef, useState } from "react";

/* Piezas compartidas de los módulos flotantes de los mapas. */

/**
 * Botón "?" que abre una explicación en un panel aparte (<dialog> nativo: foco, Esc y fondo resueltos).
 * Úsalo para el contexto y la metodología: el módulo muestra solo lo esencial.
 */
export function Ayuda({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} aria-label={`Más información: ${titulo}`} title="Más información"
        className="-m-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:text-ink">
        <span aria-hidden className="grid size-6 place-items-center rounded-full border-[1.5px] border-current text-[13px] leading-none font-bold">?</span>
      </button>
      <dialog ref={ref} aria-labelledby={id} onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] max-w-none rounded-2xl bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(25,23,20,0.3)] backdrop:bg-[rgba(25,23,20,0.45)] backdrop:backdrop-blur-[2px] max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none">
        <div className="max-h-[80dvh] overflow-y-auto px-6 pt-5 pb-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={id} className="pt-1 font-serif text-[1.6rem] leading-tight font-semibold">{titulo}</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar"
              className="-mt-1 -mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-raised hover:text-ink">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
        </div>
      </dialog>
    </>
  );
}

/** ¿Hay un panel de ayuda abierto? (la tecla Esc debe cerrarlo, no navegar). */
export const ayudaAbierta = () => typeof document !== "undefined" && !!document.querySelector("dialog[open]");

export function Burbuja({ color, grande }: { color: string; grande?: boolean }) {
  return (
    <span aria-hidden className={`${grande ? "size-4" : "size-3"} inline-block shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.22)]`}
      style={{ background: color }} />
  );
}

/** Encabezado de cada ficha del mapa. `dato` (fecha de los datos) va siempre en la primera línea, arriba del título. */
export function Cabeza({ sobre, titulo, ayuda, dato, children }: {
  sobre?: string; titulo: string; ayuda?: React.ReactNode; dato?: string; children?: React.ReactNode;
}) {
  return (
    <div className="px-6 pt-6">
      {dato && <p className="mb-1 text-[12px] text-ink-3">{dato}</p>}
      {sobre && <p className="text-[13px] font-medium text-ink-3">{sobre}</p>}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-[2rem] leading-[1.08] font-semibold tracking-[-0.01em] text-balance">{titulo}</h2>
        {ayuda && <div className="pt-1.5">{ayuda}</div>}
      </div>
      {children}
    </div>
  );
}

/** Cifra protagonista: número grande en tinta + qué significa. El color va en una pastilla, no en el texto. */
export function Cifra({ valor, texto, tono }: { valor: string; texto: string; tono?: string }) {
  return (
    <div>
      <p className={`num flex items-center gap-2 font-serif leading-none font-semibold whitespace-nowrap ${valor.length > 5 ? "text-[1.9rem]" : "text-[2.4rem]"}`}>
        {tono && <span aria-hidden className="size-3.5 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: tono }} />}
        {valor}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{texto}</p>
    </div>
  );
}

export function Pista({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-6 mt-6 flex items-center gap-2 rounded-md bg-raised px-3 py-2.5 text-[13px] text-ink-2">
      <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11V6a2 2 0 1 1 4 0v5m0-1a2 2 0 1 1 4 0v3a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5.2-3L4 14.5a1.6 1.6 0 0 1 2.6-1.8L9 15" /></svg>
      {children}
    </p>
  );
}

export function Seccion({ titulo, children, accion, ayuda }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode; ayuda?: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-line px-6 pt-6 pb-1">
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">{titulo}{ayuda}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function VerMas({ abierto, total, onClick }: { abierto: boolean; total: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={abierto}
      className="mt-1 mb-3 min-h-10 w-full cursor-pointer rounded-md text-[14px] font-semibold text-ink-2 transition-colors hover:bg-raised hover:text-ink">
      {abierto ? "Ver menos" : `Ver los ${total}`}
    </button>
  );
}

/** Fila de lista que se abre al tocarla: barra de % o burbuja de estatus, nombre, valor y flecha. */
export function Fila({ onClick, inicio, nombre, sub, valor, valorTono }: {
  onClick: () => void; inicio: React.ReactNode; nombre: string; sub?: React.ReactNode; valor: string; valorTono?: string;
}) {
  return (
    <li>
      <button type="button" onClick={onClick}
        className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-raised">
        {inicio}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-snug">{nombre}</span>
          {sub && <span className="block truncate text-[12px] text-ink-3">{sub}</span>}
        </span>
        {valor && <span className="num shrink-0 text-[14px] font-semibold" style={valorTono ? { color: valorTono } : undefined}>{valor}</span>}
        {/* Flecha: deja claro que la fila se puede abrir */}
        <svg aria-hidden viewBox="0 0 24 24" className="-mr-1 size-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </li>
  );
}

export function Pestanas<T extends string>({ valor, opciones, onChange }: { valor: T; opciones: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mx-6 mt-8 grid gap-1 rounded-lg bg-raised p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={valor === v} onClick={() => onChange(v)}
          className={`min-h-10 cursor-pointer rounded-md text-[14px] font-semibold transition-colors ${valor === v ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Esqueleto() {
  return (
    <div className="space-y-3 p-5" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded bg-raised" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-16 animate-pulse rounded bg-raised" />
        <div className="h-16 animate-pulse rounded bg-raised" />
      </div>
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded bg-raised/70" />)}
    </div>
  );
}

/**
 * Comparte un enlace /compartir/… (con su tarjeta para redes). En celular abre el menú nativo; si no hay, copia el enlace.
 */
export function BotonCompartir({ ruta, titulo, texto, className = "" }: { ruta: string; titulo: string; texto: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartir() {
    const url = `${window.location.origin}${ruta}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return; // el usuario cerró el menú
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }
  return (
    <>
      <button type="button" onClick={compartir}
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-ink px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 ${className}`}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        {copiado ? "Enlace copiado" : "Compartir"}
      </button>
      <span className="sr-only" role="status">{copiado ? "Enlace copiado al portapapeles" : ""}</span>
    </>
  );
}

/** Regresa de un golpe a la vista de todo México (en fichas de municipio, acuífero o presa). */
export function BotonInicio({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Volver a todo México"
      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-raised hover:text-ink">
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" /></svg>
      Inicio
    </button>
  );
}
