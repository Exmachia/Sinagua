"use client";

import { useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { useAncho } from "./useAncho";

type Props = {
  serie: { y: number; acuiferos: number }[];
  curva: [anio: number, centro: number, bajo: number, alto: number][]; // en número de acuíferos
  total: number;
  hoy: number;
  hitos: { pct: number; label: string; anio: number | null }[];
};

const H = 360;
const M = { t: 24, r: 16, b: 34, l: 44 };

/** % de acuíferos sobreexplotados (en déficit): histórico (sólido) + escenario de continuidad (punteado, con banda del 95%). */
export default function ProyeccionChart({ serie, curva, total, hoy, hitos }: Props) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const x0 = serie[0].y;
  const x1 = curva[curva.length - 1][0];
  const x = (y: number) => M.l + ((y - x0) / (x1 - x0)) * (W - M.l - M.r);
  const y = (pct: number) => M.t + (1 - pct / 100) * (H - M.t - M.b);
  const pct = (n: number) => (n / total) * 100;
  const ultimo = serie[serie.length - 1];

  const futuro = curva.filter(([a]) => a >= ultimo.y);
  const banda = `${futuro.map(([a, , , hi], i) => `${i ? "L" : "M"}${x(a)},${y(pct(hi))}`).join("")}${[...futuro].reverse().map(([a, , lo]) => `L${x(a)},${y(pct(lo))}`).join("")}Z`;
  const centro = futuro.map(([a, c], i) => `${i ? "L" : "M"}${x(a)},${y(pct(c))}`).join("");
  const historia = serie.map((s, i) => `${i ? "L" : "M"}${x(s.y)},${y(pct(s.acuiferos))}`).join("");
  const decadas = [x0, 2020, 2030, 2040, 2050, 2060].filter((a, i) => a >= x0 && a <= x1 && (i === 0 || a - x0 >= 5));
  const angosto = W < 560;

  const anioHover = hover;
  const real = anioHover !== null ? serie.find((s) => s.y === anioHover) : undefined;
  const proy = anioHover !== null ? curva.find(([a]) => a === anioHover) : undefined;

  return (
    <div ref={ref} className="relative w-full min-w-0" style={{ minHeight: H }}>
      {W > 0 && <svg width={W} height={H} className="block touch-pan-y select-none" role="img"
        aria-label={`Porcentaje de acuíferos sobreexplotados: de ${fmt(pct(serie[0].acuiferos), 0)}% en ${x0} a ${fmt(pct(ultimo.acuiferos), 0)}% en ${ultimo.y}. Si sigue la tendencia: ${hitos.map((h) => `${h.label} hacia ${h.anio}`).join("; ")}.`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const a = Math.round(x0 + ((e.clientX - r.left - M.l) / (W - M.l - M.r)) * (x1 - x0));
          setHover(Math.min(x1, Math.max(x0, a)));
        }}>
        {/* Rejilla y eje */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={M.l - 8} y={y(v)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[12px]">{v}%</text>
          </g>
        ))}
        {decadas.map((a) => (
          <text key={a} x={x(a)} y={H - 10} textAnchor="middle" className="num fill-ink-3 text-[12px]">{a}</text>
        ))}

        {/* Hoy */}
        <line x1={x(hoy)} x2={x(hoy)} y1={M.t - 8} y2={H - M.b} stroke="var(--ink-3)" strokeDasharray="2 3" />
        <text x={x(hoy) + 6} y={M.t - 6} className="fill-ink-2 text-[12px] font-semibold">hoy</text>

        {/* Escenario */}
        <path d={banda} fill="var(--s-critico)" opacity="0.1" />
        <path d={centro} fill="none" stroke="var(--s-critico)" strokeWidth="2.5" strokeDasharray="7 5" strokeLinecap="round" />

        {/* Hitos: dónde la tendencia cruza la mitad, tres cuartos y todos */}
        {hitos.filter((h) => h.anio && h.anio <= x1).map((h) => (
          <g key={h.pct}>
            <line x1={M.l} x2={x(h.anio!)} y1={y(h.pct)} y2={y(h.pct)} stroke="var(--s-critico)" strokeOpacity="0.35" />
            <circle cx={x(h.anio!)} cy={y(h.pct)} r="6" fill="var(--surface)" stroke="var(--s-critico)" strokeWidth="2.5" />
            <text x={x(h.anio!) + (h.anio! > x1 - 8 ? -10 : 10)} y={y(h.pct) - 10} textAnchor={h.anio! > x1 - 8 ? "end" : "start"}
              className="num fill-ink text-[13px] font-semibold" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">
              {angosto ? h.anio : `${h.label} · ${h.anio}`}
            </text>
          </g>
        ))}

        {/* Histórico */}
        <path d={historia} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        {serie.map((s) => (
          <circle key={s.y} cx={x(s.y)} cy={y(pct(s.acuiferos))} r="4.5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />
        ))}

        {/* Cursor */}
        {anioHover !== null && (
          <line x1={x(anioHover)} x2={x(anioHover)} y1={M.t} y2={H - M.b} stroke="var(--ink-2)" />
        )}
      </svg>}

      {anioHover !== null && (real || proy) && (
        <div className="pointer-events-none absolute top-2 rounded-lg bg-surface px-3 py-2 text-[13px] shadow-[0_8px_24px_rgba(25,23,20,0.16)] ring-1 ring-black/5"
          style={{ left: Math.min(Math.max(x(anioHover) + 12, 0), W - 190) }}>
          <p className="num font-semibold">{anioHover}</p>
          {real ? (
            <p className="text-ink-2"><span className="num font-semibold text-ink">{real.acuiferos}</span> acuíferos sobreexplotados ({fmt(pct(real.acuiferos), 0)}%) · dato oficial</p>
          ) : proy && (
            <p className="text-ink-2">
              Escenario: <span className="num font-semibold text-ink">{fmt(pct(proy[1]), 0)}%</span>
              <br />rango probable {fmt(pct(proy[2]), 0)}–{fmt(pct(proy[3]), 0)}%
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-ink" />Datos oficiales (DOF)</span>
        <span className="inline-flex items-center gap-2"><span className="h-0 w-6 border-t-2 border-dashed border-critico" />Si sigue la tendencia</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded-sm bg-critico/10" />Rango probable (95%)</span>
      </div>

      <table className="sr-only">
        <caption>Acuíferos sobreexplotados por año</caption>
        <tbody>
          {serie.map((s) => <tr key={s.y}><th scope="row">{s.y}</th><td>{s.acuiferos} (dato oficial)</td></tr>)}
          {curva.filter(([a]) => a > ultimo.y && a % 5 === 0).map(([a, c, lo, hi]) => (
            <tr key={a}><th scope="row">{a}</th><td>{Math.round(c)} (escenario; rango {Math.round(lo)}–{Math.round(hi)})</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
