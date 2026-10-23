import operadores from "@/data/operadores.json";
import { fechaCorta } from "@/lib/presas";
import { Ayuda } from "./ui";

/** ¿Quién da el servicio de agua? Casos revisados a mano (src/data/operadores.json). */
export type Operador = (typeof operadores.casos)[number];
export const OPERADORES = operadores.casos;
export const REVISADO = operadores.revisado;

const TIPO: Record<string, { label: string; clase: string }> = {
  privado: { label: "Privado", clase: "bg-[#5b4a9e]/10 text-[#4a3c85]" },
  mixto: { label: "Mixto", clase: "bg-[#5b4a9e]/10 text-[#4a3c85]" },
  revertido: { label: "Volvió a ser público", clase: "bg-raised text-ink-2" },
};

export function AyudaOperadores() {
  return (
    <Ayuda titulo="Quién da el servicio de agua">
      <p>
        En la mayoría de las ciudades el agua potable la da un organismo público del municipio o del estado. En algunas, el
        gobierno se la concesionó a una empresa: ella cobra, opera y mantiene la red.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Privado:</strong> una empresa tiene la concesión del servicio.</li>
        <li><strong>Mixto:</strong> una empresa en la que participan el municipio y una compañía privada.</li>
        <li><strong>Volvió a ser público:</strong> estuvo en manos de empresas y el gobierno lo recuperó.</li>
      </ul>
      <p>
        No hay una base oficial con estos datos: los revisamos a mano, caso por caso, con contratos y notas de prensa. Solo
        mostramos lo que pudimos confirmar. Última revisión: {fechaCorta(REVISADO)}.
      </p>
    </Ayuda>
  );
}

function Fila({ c, sinEtiqueta }: { c: Operador; sinEtiqueta?: boolean }) {
  const t = TIPO[c.tipo];
  return (
    <li className="py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="leading-snug">
          <span className="font-semibold">{c.ciudad}</span>
          {c.estadoNombre !== c.ciudad && <span className="text-ink-3"> · {c.estadoNombre}</span>}
        </p>
        {!sinEtiqueta && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.clase}`}>{t.label}</span>}
      </div>
      <p className="mt-1 text-[14px] text-ink-2">
        {c.empresa}
        {c.tipo !== "revertido" && <span className="text-ink-3"> · hasta {c.hasta}</span>}
      </p>
      <p className="mt-1 text-[13px] text-ink-3">
        {c.situacion}{" "}
        {c.fuentes.map((f, i) => (
          <span key={f.url}>
            {i > 0 && " · "}
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">{f.nombre}</a>
          </span>
        ))}
      </p>
    </li>
  );
}

export function ListaOperadores({ casos, sinEtiqueta }: { casos: Operador[]; sinEtiqueta?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {casos.map((c) => <Fila key={c.id} c={c} sinEtiqueta={sinEtiqueta} />)}
    </ul>
  );
}

/** Tarjeta de una ciudad para la cuadrícula de la portada. */
export function TarjetaCaso({ c }: { c: Operador }) {
  const t = TIPO[c.tipo];
  return (
    <article className="flex h-full flex-col rounded-2xl bg-surface p-5 ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.clase}`}>{t.label}</span>
        <span className="num text-[13px] text-ink-3">hasta {c.hasta}</span>
      </div>
      <h4 className="mt-3 font-serif text-[1.35rem] leading-tight font-semibold">{c.ciudad}</h4>
      {c.estadoNombre !== c.ciudad && <p className="text-[13px] text-ink-3">{c.estadoNombre}</p>}
      <p className="mt-3 text-[14px] leading-snug">{c.empresa}</p>
      <p className="mt-2 text-[13px] leading-snug text-ink-2">{c.situacion}</p>
      <p className="mt-auto pt-4 text-[12px] text-ink-3">
        {c.fuentes.map((f, i) => (
          <span key={f.url}>
            {i > 0 && " · "}
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">{f.nombre}</a>
          </span>
        ))}
      </p>
    </article>
  );
}
