"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Marca from "../Marca";

const SECCIONES = [
  { id: "realidad", label: "La realidad" },
  { id: "sequia", label: "Sequía" },
  { id: "proyeccion", label: "Si seguimos así" },
  { id: "presas", label: "Presas" },
  { id: "usos", label: "Quién la usa" },
  { id: "calidad", label: "¿Está limpia?" },
] as const;

/**
 * Barra flotante de todo el sitio. Escritorio: Datos ▾ (secciones de la portada) · Artículos · Urgente · Abrir el mapa.
 * Celular: Urgente · Mapa · ☰ (artículos y secciones). En la portada resalta la sección visible y ofrece volver arriba.
 */
export default function NavFlotante() {
  const ruta = usePathname();
  const enInicio = ruta === "/";
  const [activa, setActiva] = useState<string | null>(null);
  const [elevada, setElevada] = useState(false);
  const [lejos, setLejos] = useState(false); // ya bajó bastante: se ofrece volver arriba
  const [menu, setMenu] = useState(false);
  const [datos, setDatos] = useState(false);
  const caja = useRef<HTMLElement>(null);
  const ancla = (id: string) => (enInicio ? `#${id}` : `/#${id}`);

  useEffect(() => {
    const onScroll = () => {
      setElevada(window.scrollY > 24);
      setLejos(window.scrollY > window.innerHeight * 2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!enInicio) return () => window.removeEventListener("scroll", onScroll);
    const io = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiva(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const s of SECCIONES) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [enInicio]);

  // Menús: se cierran al tocar fuera o con Esc
  useEffect(() => {
    if (!menu && !datos) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setMenu(false);
        setDatos(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setDatos(false);
      }
    };
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", fuera);
      window.removeEventListener("keydown", esc);
    };
  }, [menu, datos]);

  const enSeccion = enInicio && activa !== null;

  return (
    <header ref={caja} className="pointer-events-none fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <nav aria-label="Principal"
        className={`pointer-events-auto mx-auto flex max-w-5xl items-center gap-1.5 rounded-full bg-surface/95 py-1.5 pr-1.5 pl-5 ring-1 backdrop-blur-xl transition-shadow duration-300 ${
          elevada ? "shadow-[0_10px_30px_rgba(25,23,20,0.12)] ring-black/10" : "ring-black/5"
        }`}>
        <Link href="/" aria-label="Sinagua, inicio" className="mr-auto text-xl"><Marca /></Link>

        {/* Escritorio */}
        <div className="relative hidden md:block">
          <button type="button" onClick={() => setDatos((x) => !x)} aria-expanded={datos} aria-haspopup="true"
            className={`inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full px-3.5 text-[14px] transition-colors ${
              enSeccion || datos ? "bg-ink/[0.07] font-semibold text-ink" : "text-ink-2 hover:text-ink"
            }`}>
            {enSeccion ? SECCIONES.find((s) => s.id === activa)?.label : "Datos"}
            <svg aria-hidden viewBox="0 0 24 24" className={`size-4 transition-transform ${datos ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {datos && (
            <ul className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-surface p-1.5 shadow-[0_12px_36px_rgba(25,23,20,0.16)] ring-1 ring-black/5">
              {SECCIONES.map((s) => (
                <li key={s.id}>
                  <a href={ancla(s.id)} onClick={() => setDatos(false)}
                    className={`flex min-h-10 items-center rounded-xl px-3 text-[14px] hover:bg-raised ${enInicio && activa === s.id ? "font-semibold" : ""}`}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link href="/articulos" aria-current={ruta.startsWith("/articulos") ? "page" : undefined}
          className={`hidden min-h-10 items-center rounded-full px-3.5 text-[14px] transition-colors md:inline-flex ${
            ruta.startsWith("/articulos") ? "bg-ink/[0.07] font-semibold text-ink" : "text-ink-2 hover:text-ink"
          }`}>
          Artículos
        </Link>

        <Link href="/urgente" aria-current={ruta === "/urgente" ? "page" : undefined}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap text-critico ring-1 ring-critico/30 transition-colors hover:bg-critico/[0.06]">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-critico opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-critico" />
          </span>
          Urgente
        </Link>

        <Link href="/mapa" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-85">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
          <span className="max-sm:hidden">Abrir el mapa</span>
          <span className="sm:hidden">Mapa</span>
        </Link>

        <button type="button" onClick={() => setMenu((x) => !x)} aria-expanded={menu} aria-controls="menu-movil" aria-label="Menú"
          className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-raised md:hidden">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menu ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {menu && (
        <div id="menu-movil" className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-2xl bg-surface/95 p-2 shadow-[0_10px_30px_rgba(25,23,20,0.14)] ring-1 ring-black/5 backdrop-blur-xl md:hidden">
          <Link href="/articulos" onClick={() => setMenu(false)} className="flex min-h-12 items-center rounded-xl px-4 text-[16px] font-semibold">
            Artículos
          </Link>
          <p className="mt-1 border-t border-line px-4 pt-3 pb-1 text-[12px] font-semibold text-ink-3">Datos</p>
          <ul>
            {SECCIONES.map((s) => (
              <li key={s.id}>
                <a href={ancla(s.id)} onClick={() => setMenu(false)}
                  className={`flex min-h-12 items-center rounded-xl px-4 text-[16px] ${enInicio && activa === s.id ? "bg-raised font-semibold" : ""}`}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-line pt-2">
            <Link href="/presas" onClick={() => setMenu(false)} className="flex min-h-12 items-center rounded-xl px-4 text-[15px]">Mapa de presas</Link>
            <Link href="/sequia" onClick={() => setMenu(false)} className="flex min-h-12 items-center rounded-xl px-4 text-[15px]">Mapa de sequía</Link>
          </div>
        </div>
      )}

      {lejos && (
        <button type="button" aria-label="Volver al inicio de la página"
          onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
          className="pointer-events-auto fixed right-4 bottom-5 grid size-12 cursor-pointer place-items-center rounded-full bg-ink text-white shadow-[0_8px_24px_rgba(25,23,20,0.25)] transition-opacity hover:opacity-85">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
        </button>
      )}
    </header>
  );
}
