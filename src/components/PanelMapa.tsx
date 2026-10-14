"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/** Posiciones de la hoja en móvil: solo el encabezado, a la mitad, o casi toda la pantalla. */
export type Nivel = "bajo" | "medio" | "alto";
const ORDEN: Nivel[] = ["bajo", "medio", "alto"];
const ALTO_BAJO = 84; // barrita + encabezado

/** Altura visible de la hoja en móvil (para que el mapa encuadre en el espacio libre). */
export const visibleMovil = (nivel: Nivel, alto: number) => (nivel === "bajo" ? ALTO_BAJO : Math.round(alto * 0.5));

type Props = {
  escritorio: boolean;
  /** Escritorio: panel desplegado o plegado. */
  abierto: boolean;
  onAbierto: (v: boolean) => void;
  /** Móvil: posición de la hoja. */
  nivel: Nivel;
  onNivel: (n: Nivel) => void;
  etiqueta: string;
  /** Lado izquierdo del encabezado: regresar, ruta. */
  encabezado: ReactNode;
  cuerpoRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

/**
 * Panel de información del mapa.
 * Escritorio: tarjeta flotante a la izquierda que se puede plegar.
 * Móvil: hoja inferior con tres posiciones (como en Apple Maps). Se arrastra desde la barrita o el encabezado y se
 * ajusta a la posición más cercana (o a la siguiente si el gesto es rápido). A la mitad, deslizar sobre el contenido
 * mueve la hoja; arriba, el contenido hace scroll y, jalando hacia abajo desde el inicio, la hoja baja.
 */
export default function PanelMapa({ escritorio, abierto, onAbierto, nivel, onNivel, etiqueta, encabezado, cuerpoRef, children }: Props) {
  const medidor = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLElement>(null);
  const [H, setH] = useState(0);

  useEffect(() => {
    const el = medidor.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
    // El medidor solo existe en móvil: se vuelve a medir al cambiar de modo (el primer render asume escritorio).
  }, [escritorio]);

  const alturas: Record<Nivel, number> = { bajo: ALTO_BAJO, medio: Math.round(H * 0.5), alto: Math.max(H - 10, ALTO_BAJO) };
  const altoHoja = alturas.alto;

  /* ---------- arrastre ---------- */
  const arrastre = useRef<{ y0: number; vis0: number; yPrev: number; tPrev: number; vel: number; activo: boolean } | null>(null);
  const acabaDeArrastrar = useRef(false);

  const mover = (vis: number, animar: boolean) => {
    const el = hoja.current;
    if (!el) return;
    el.style.transition = animar ? "" : "none";
    el.style.transform = `translateY(${altoHoja - vis}px)`;
  };
  const limitar = (v: number) => Math.min(Math.max(v, alturas.bajo), alturas.alto);

  const empezar = (y: number) => {
    arrastre.current = { y0: y, vis0: alturas[nivel], yPrev: y, tPrev: performance.now(), vel: 0, activo: false };
  };
  /** Devuelve true si el gesto ya es un arrastre (para cancelar el scroll o el clic). */
  const seguir = (y: number) => {
    const a = arrastre.current;
    if (!a) return false;
    if (!a.activo) {
      if (Math.abs(y - a.y0) < 6) return false;
      a.activo = true;
    }
    const ahora = performance.now();
    a.vel = (a.yPrev - y) / Math.max(ahora - a.tPrev, 1); // px/ms, positivo hacia arriba
    a.yPrev = y;
    a.tPrev = ahora;
    mover(limitar(a.vis0 - (y - a.y0)), false);
    return true;
  };
  const terminar = (y: number) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a?.activo) return;
    acabaDeArrastrar.current = true;
    setTimeout(() => (acabaDeArrastrar.current = false), 50);
    // Proyecta el gesto: un deslizamiento rápido avanza a la siguiente posición.
    const proyectado = limitar(a.vis0 - (y - a.y0)) + a.vel * 200;
    const destino = ORDEN.reduce((m, n) => (Math.abs(alturas[n] - proyectado) < Math.abs(alturas[m] - proyectado) ? n : m));
    mover(alturas[destino], true);
    onNivel(destino);
  };

  const puntero = {
    onPointerDown: (e: React.PointerEvent) => {
      if (escritorio || (e.pointerType === "mouse" && e.button !== 0)) return;
      empezar(e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (seguir(e.clientY) && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerUp: (e: React.PointerEvent) => terminar(e.clientY),
    onPointerCancel: (e: React.PointerEvent) => terminar(e.clientY),
    onClickCapture: (e: React.MouseEvent) => {
      if (acabaDeArrastrar.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  // Arriba: el contenido hace scroll; jalar hacia abajo desde el inicio mueve la hoja (eventos táctiles no pasivos).
  const nivelActual = useRef(nivel);
  useEffect(() => {
    nivelActual.current = nivel;
  });
  const fn = useRef({ empezar, seguir, terminar });
  useEffect(() => {
    fn.current = { empezar, seguir, terminar };
  });
  useEffect(() => {
    const el = cuerpoRef.current;
    if (!el || escritorio) return;
    let desdeArriba = false;
    const inicio = (e: TouchEvent) => {
      desdeArriba = nivelActual.current === "alto" && el.scrollTop <= 0;
      if (desdeArriba) fn.current.empezar(e.touches[0].clientY);
    };
    const mov = (e: TouchEvent) => {
      if (!desdeArriba) return;
      const a = arrastre.current;
      const y = e.touches[0].clientY;
      if (a && !a.activo && y < a.y0) {
        desdeArriba = false; // hacia arriba: es scroll normal
        arrastre.current = null;
        return;
      }
      if (fn.current.seguir(y)) e.preventDefault();
    };
    const fin = (e: TouchEvent) => {
      if (desdeArriba) fn.current.terminar(e.changedTouches[0].clientY);
      desdeArriba = false;
    };
    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", mov, { passive: false });
    el.addEventListener("touchend", fin);
    el.addEventListener("touchcancel", fin);
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", mov);
      el.removeEventListener("touchend", fin);
      el.removeEventListener("touchcancel", fin);
    };
  }, [cuerpoRef, escritorio]);

  const subirBajar = (dir: 1 | -1) => {
    const i = ORDEN.indexOf(nivel) + dir;
    if (i >= 0 && i < ORDEN.length) onNivel(ORDEN[i]);
  };

  const chevron = (
    <button type="button"
      onClick={() => (escritorio ? onAbierto(!abierto) : onNivel(nivel === "bajo" ? "medio" : "bajo"))}
      aria-expanded={escritorio ? abierto : nivel !== "bajo"}
      aria-label={escritorio ? (abierto ? "Plegar panel" : "Mostrar panel") : nivel === "bajo" ? "Mostrar panel" : "Bajar panel"}
      className="ml-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-ink-2 transition-colors hover:bg-raised hover:text-ink">
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        className={`size-5 transition-transform duration-200 ${(escritorio ? !abierto : nivel !== "bajo") ? "rotate-180" : ""}`}>
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>
  );

  /* ---------- escritorio ---------- */
  if (escritorio) {
    return (
      <article aria-label={etiqueta}
        className="pointer-events-auto absolute top-[130px] left-3 z-20 flex max-h-[calc(100%-142px)] w-[400px] flex-col overflow-hidden rounded-[10px] bg-surface shadow-[0_10px_40px_rgba(25,23,20,0.18)] ring-1 ring-black/5">
        <header className="flex items-center gap-1 border-b border-line p-1.5">
          {encabezado}
          {chevron}
        </header>
        <div ref={cuerpoRef} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${abierto ? "" : "hidden"}`} aria-live="polite">
          {children}
        </div>
      </article>
    );
  }

  /* ---------- móvil: hoja inferior ---------- */
  return (
    <>
      <div ref={medidor} className="pointer-events-none absolute inset-0" aria-hidden />
      <article ref={hoja} aria-label={etiqueta}
        style={{ height: altoHoja, transform: `translateY(${altoHoja - alturas[nivel]}px)`, visibility: H ? "visible" : "hidden" }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-surface shadow-[0_-8px_40px_rgba(25,23,20,0.2)] ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none">
        {/* Zona de arrastre: barrita + encabezado */}
        <div className="shrink-0 touch-none select-none" {...puntero}>
          <button type="button" onClick={() => onNivel(ORDEN[(ORDEN.indexOf(nivel) + 1) % ORDEN.length])}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); subirBajar(1); }
              if (e.key === "ArrowDown") { e.preventDefault(); subirBajar(-1); }
            }}
            aria-label={`Ajustar el tamaño del panel (ahora: ${nivel === "bajo" ? "abajo" : nivel === "medio" ? "a la mitad" : "arriba"})`}
            className="flex h-6 w-full cursor-grab items-center justify-center active:cursor-grabbing">
            <span aria-hidden className="h-1.5 w-10 rounded-full bg-line-strong" />
          </button>
          <header className="flex items-center gap-1 border-b border-line px-1.5 pb-1.5">
            {encabezado}
            {chevron}
          </header>
        </div>
        <div ref={cuerpoRef} aria-live="polite"
          className={`min-h-0 flex-1 overscroll-contain ${nivel === "alto" ? "overflow-y-auto" : "touch-none overflow-hidden"}`}
          {...(nivel === "alto" ? {} : puntero)}>
          {children}
        </div>
      </article>
    </>
  );
}
