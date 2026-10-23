"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Leyenda de un mapa. En escritorio, recuadro fijo abajo a la derecha. En celular, un botón pequeño (para no quitarle
 * protagonismo al mapa) que la abre y la cierra. Ambos llevan a la metodología.
 */
export default function LeyendaMapa({ children, arriba = "top-[124px]" }: { children: React.ReactNode; arriba?: string }) {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false);
    };
    window.addEventListener("pointerdown", fuera);
    return () => window.removeEventListener("pointerdown", fuera);
  }, [abierta]);

  const metodo = (
    <div className="mt-2 flex justify-end border-t border-line pt-1.5">
      <Link href="/metodologia" className="pointer-events-auto text-ink-3 underline-offset-2 hover:text-ink hover:underline">
        Cómo se mide →
      </Link>
    </div>
  );

  return (
    <>
      <div className="pointer-events-none absolute right-3 bottom-9 z-10 rounded-lg bg-surface/95 px-3 py-2.5 text-[12px] shadow-[0_4px_16px_rgba(25,23,20,0.12)] ring-1 ring-black/5 backdrop-blur max-lg:hidden">
        {children}
        {metodo}
      </div>

      <div ref={caja} className={`absolute right-3 z-40 lg:hidden ${arriba}`}>
        {abierta ? (
          // La tarjeta mide lo que su contenido y la X va dentro, arriba a la derecha.
          <div className="relative w-max max-w-[min(280px,calc(100vw-24px))] rounded-lg bg-surface px-3 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(25,23,20,0.18)] ring-1 ring-black/5">
            <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar la explicación de los colores"
              className="absolute top-1 right-1 grid size-9 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-raised">
              <svg aria-hidden viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <div className="max-h-[55dvh] overflow-y-auto [&>p:first-child]:pr-8">
              {children}
              {metodo}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAbierta(true)} aria-expanded={false} aria-label="¿Qué significan los colores?"
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-surface text-ink-2 shadow-[0_4px_14px_rgba(25,23,20,0.16)] ring-1 ring-black/5">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5">
              <circle cx="8" cy="9" r="3.2" fill="#8c3436" />
              <circle cx="16" cy="9" r="3.2" fill="#e7d17a" />
              <circle cx="12" cy="16" r="3.2" fill="#32856c" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
