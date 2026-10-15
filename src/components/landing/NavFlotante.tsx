"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Marca from "../Marca";

const SECCIONES = [
  { id: "realidad", label: "La realidad" },
  { id: "sequia", label: "Sequía" },
  { id: "proyeccion", label: "Si seguimos así" },
  { id: "presas", label: "Presas" },
  { id: "usos", label: "Quién la usa" },
  { id: "calidad", label: "¿Está limpia?" },
] as const;

/** Barra flotante que acompaña toda la landing: resalta la sección visible y siempre ofrece el mapa. */
export default function NavFlotante() {
  const [activa, setActiva] = useState<string | null>(null);
  const [elevada, setElevada] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevada(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
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
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <nav aria-label="Principal"
        className={`pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-full bg-surface/95 py-1.5 pr-1.5 pl-5 ring-1 backdrop-blur-xl transition-shadow duration-300 ${
          elevada ? "shadow-[0_10px_30px_rgba(25,23,20,0.12)] ring-black/10" : "ring-black/5"
        }`}>
        <a href="#inicio" aria-label="Sinagua, inicio" className="mr-auto text-xl"><Marca /></a>

        <ul className="hidden items-center gap-1 md:flex">
          {SECCIONES.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={activa === s.id ? "true" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-[14px] transition-colors ${
                  activa === s.id ? "bg-ink/[0.07] font-semibold text-ink" : "text-ink-2 hover:text-ink"
                }`}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <Link href="/mapa" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-85">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
          Abrir el mapa
        </Link>

        <button type="button" onClick={() => setMenu((x) => !x)} aria-expanded={menu} aria-controls="menu-movil" aria-label="Menú"
          className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-raised md:hidden">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menu ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {menu && (
        <ul id="menu-movil" className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-2xl bg-surface/95 p-2 shadow-[0_10px_30px_rgba(25,23,20,0.14)] ring-1 ring-black/5 backdrop-blur-xl md:hidden">
          {SECCIONES.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} onClick={() => setMenu(false)}
                className={`flex min-h-12 items-center rounded-xl px-4 text-[16px] ${activa === s.id ? "bg-raised font-semibold" : ""}`}>
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/presas" className="flex min-h-12 items-center rounded-xl px-4 text-[16px]">Mapa de presas</Link>
          </li>
        </ul>
      )}
    </header>
  );
}
