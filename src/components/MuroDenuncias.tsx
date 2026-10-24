"use client";

import { useState } from "react";
import { fechaDenuncia, type Denuncia } from "@/lib/denuncias";

/** Abre el formulario "Cuéntanos" (vive en la barra flotante). */
export function abrirReportar() {
  window.dispatchEvent(new Event("sinagua:reportar"));
}

export function BotonDenunciar({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={abrirReportar}
      className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-critico px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 ${className}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
      Manda tu denuncia
    </button>
  );
}

/** Muro de denuncias: tarjetas anónimas, con filtro por estado. */
export default function MuroDenuncias({ denuncias }: { denuncias: Denuncia[] }) {
  const [estado, setEstado] = useState("");
  const estados = [...new Map(denuncias.map((d) => [d.estado, d.estadoNombre])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const lista = estado ? denuncias.filter((d) => d.estado === estado) : denuncias;

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-2 max-sm:-mx-4 max-sm:mt-9 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1 max-sm:[scrollbar-width:none]" role="group" aria-label="Filtrar por estado">
        {[["", "Todos"] as [string, string], ...estados].map(([cve, nombre]) => {
          const n = cve ? denuncias.filter((d) => d.estado === cve).length : denuncias.length;
          const activo = estado === cve;
          return (
            <button key={cve || "todos"} type="button" onClick={() => setEstado(cve)} aria-pressed={activo}
              className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[14px] whitespace-nowrap transition-colors ${
                activo ? "bg-ink font-semibold text-white" : "bg-surface text-ink-2 ring-1 ring-line-strong hover:text-ink"
              }`}>
              {nombre} <span className={`num text-[12px] ${activo ? "text-white/70" : "text-ink-3"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {lista.map((d) => (
          <li key={d.id} className="mb-5 break-inside-avoid rounded-2xl bg-surface p-6 ring-1 ring-black/5">
            <p className="font-serif text-[1.2rem] leading-snug text-pretty">“{d.mensaje}”</p>
            <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-ink-3">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              </span>
              <div className="min-w-0 flex-1 text-[13px] leading-snug">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">Anónimo</span>
                  <time dateTime={d.fecha} className="text-[12px] whitespace-nowrap text-ink-3">{fechaDenuncia(d.fecha)}</time>
                </p>
                <p className="text-ink-3">{[d.municipio, d.estadoNombre].filter(Boolean).join(", ")}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
