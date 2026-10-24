"use client";

import { useId, useMemo, useRef, useState } from "react";
import { normaliza } from "@/lib/acuiferos";

/** Una opción buscable. `key` es el texto normalizado contra el que se compara. */
export type Opcion<T> = { key: string; tipo: string; label: string; sub: string; valor: T; color?: string };

type Props<T> = {
  opciones: Opcion<T>[];
  onPick: (valor: T) => void;
  /** La lista todavía no llega: se puede escribir, y mientras tanto se avisa. */
  cargando?: boolean;
  etiqueta: string;
  placeholder: string;
  grande?: boolean;
  /** Integrado en un módulo flotante: sin borde propio. */
  flotante?: boolean;
};

/** Combobox accesible: teclado (↑ ↓ Enter Esc), coincidencia exacta → inicio de palabra → contiene. */
export default function Buscador<T>({ opciones, onPick, etiqueta, placeholder, grande, flotante, cargando }: Props<T>) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => {
    const t = normaliza(q);
    if (t.length < 2) return [];
    const exacto: Opcion<T>[] = [];
    const inicio: Opcion<T>[] = [];
    const contiene: Opcion<T>[] = [];
    for (const i of opciones) {
      if (i.key === t) exacto.push(i);
      else if (i.key.startsWith(t) || i.key.split(/[\s-]/).some((w) => w.startsWith(t))) inicio.push(i);
      else if (i.key.includes(t)) contiene.push(i);
    }
    return [...exacto, ...inicio, ...contiene].slice(0, 9);
  }, [q, opciones]);

  function pick(i: Opcion<T>) {
    onPick(i.valor);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return setOpen(false);
    if (!resultados.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(resultados[active]);
    }
  }

  const expanded = open && normaliza(q).length >= 2;

  return (
    <div className="relative">
      <label htmlFor={`${id}-in`} className={grande ? "mb-2 block text-[15px] font-semibold" : "sr-only"}>
        {etiqueta}
      </label>
      <div className="relative">
        <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 text-ink-3 ${grande && !flotante ? "left-5" : "left-3.5"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          id={`${id}-in`}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && resultados[active] ? `${id}-${active}` : undefined}
          className={`w-full pr-3 pl-11 text-ink placeholder:text-ink-3 outline-none ${
            flotante
              ? "h-12 rounded-[10px] bg-transparent text-base focus:shadow-[inset_0_0_0_2px_var(--focus)]"
              : `rounded-full bg-surface shadow-[0_6px_24px_rgba(25,23,20,0.10)] ring-1 ring-line-strong transition-shadow hover:shadow-[0_8px_28px_rgba(25,23,20,0.14)] focus:shadow-[0_0_0_3px_rgba(31,111,199,0.25)] focus:ring-ink ${grande ? "h-14 pl-12 text-lg" : "h-12 text-base"}`
          }`}
        />
      </div>

      {expanded && (
        <ul id={`${id}-list`} role="listbox" className={`absolute inset-x-0 top-full z-30 mt-1.5 max-h-[26rem] overflow-y-auto bg-surface ${flotante ? "rounded-[10px] shadow-[0_10px_40px_rgba(25,23,20,0.2)] ring-1 ring-black/5" : "rounded-2xl shadow-[0_12px_40px_rgba(25,23,20,0.18)] ring-1 ring-black/5"}`}>
          {resultados.length === 0 && (
            <li className="px-4 py-3 text-[15px] text-ink-2">
              {cargando ? "Cargando…" : <>No encontramos “{q}”. Revisa la ortografía o prueba con tu estado.</>}
            </li>
          )}
          {resultados.map((r, i) => (
            <li
              key={`${r.tipo}-${r.label}-${r.sub}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-12 cursor-pointer items-center gap-3 border-b border-line px-4 py-2 last:border-b-0 ${i === active ? "bg-raised" : ""}`}
            >
              <span className="w-[4.6rem] shrink-0 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{r.tipo}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{r.label}</span>
                <span className="flex items-center gap-1.5 truncate text-[13px] text-ink-3">
                  {r.color && <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />}
                  {r.sub}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
