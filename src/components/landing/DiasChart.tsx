"use client";

import { useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { fechaCorta } from "@/lib/presas";
import { useAncho } from "./useAncho";

type Props = {
  serie: [string, number, number][]; // fecha, días, % de llenado
  peor: { f: string; dias: number };
  nombre: string;
};

const H = 220;
const M = { t: 16, r: 10, b: 28, l: 44 };
const TOPE = 1095; // 3 años: arriba de esto la línea se recorta (con poca extracción los "días" se disparan)
const MEDIO_ANIO = 182;

/** Días de agua semana a semana. La franja inferior marca "menos de 6 meses". */
export default function DiasChart({ serie, peor, nombre }: Props) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = serie.length;
  const t0 = Date.parse(serie[0][0]);
  const t1 = Date.parse(serie[n - 1][0]);
  const x = (f: string) => M.l + ((Date.parse(f) - t0) / (t1 - t0)) * (W - M.l - M.r);
  const y = (d: number) => M.t + (1 - Math.min(d, TOPE) / TOPE) * (H - M.t - M.b);
  const linea = serie.map((s, i) => `${i ? "L" : "M"}${x(s[0]).toFixed(1)},${y(s[1]).toFixed(1)}`).join("");
  const area = `${linea}L${x(serie[n - 1][0]).toFixed(1)},${y(0)}L${x(serie[0][0]).toFixed(1)},${y(0)}Z`;
  const anios = Array.from(new Set(serie.map((s) => s[0].slice(0, 4)))).filter((a, i) => i % (W < 480 ? 4 : 2) === 0);
  const sel = hover !== null ? serie[hover] : null;
  const ult = serie[n - 1];

  return (
    <div ref={ref} className="relative w-full min-w-0" style={{ minHeight: H }}>
      {W > 0 && (
        <svg width={W} height={H} className="block touch-pan-y select-none" role="img"
          aria-label={`${nombre}: días de agua de ${serie[0][0].slice(0, 4)} a hoy. Peor momento: ${peor.dias} días el ${fechaCorta(peor.f)}.`}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - r.left - M.l) / (W - M.l - M.r);
            setHover(p < -0.02 || p > 1.02 ? null : Math.max(0, Math.min(n - 1, Math.round(p * (n - 1)))));
          }}>
          <rect x={M.l} y={y(MEDIO_ANIO)} width={W - M.l - M.r} height={y(0) - y(MEDIO_ANIO)} fill="var(--s-critico)" opacity="0.09" />
          {[0, 365, 730, TOPE].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={M.l - 6} y={y(v)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[12px]">
                {v === 0 ? "0" : v === TOPE ? "3+ a" : `${v / 365} a`}
              </text>
            </g>
          ))}
          <text x={M.l + 6} y={y(MEDIO_ANIO) + 14} className="fill-critico text-[11px] font-semibold">menos de 6 meses</text>
          {anios.map((a) => (
            <text key={a} x={x(`${a}-01-01`)} y={H - 9} textAnchor="middle" className="num fill-ink-3 text-[12px]">{a}</text>
          ))}
          <path d={area} fill="var(--agua)" opacity="0.12" />
          <path d={linea} fill="none" stroke="var(--agua)" strokeWidth="2" strokeLinejoin="round" />
          {/* Peor momento y hoy */}
          <circle cx={x(peor.f)} cy={y(peor.dias)} r="5" fill="var(--s-critico)" stroke="var(--surface)" strokeWidth="2" />
          <circle cx={x(ult[0])} cy={y(ult[1])} r="5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />
          {sel && hover !== null && (
            <line x1={x(sel[0])} x2={x(sel[0])} y1={M.t} y2={y(0)} stroke="var(--ink)" strokeWidth="1" opacity="0.4" />
          )}
        </svg>
      )}
      {sel && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-surface px-3 py-2 text-[13px] shadow-[0_8px_24px_rgba(25,23,20,0.16)] ring-1 ring-black/5"
          style={{ left: Math.max(0, Math.min(x(sel[0]) + 10, W - 170)) }}>
          <p className="font-semibold">{fechaCorta(sel[0])}</p>
          <p className="text-ink-2"><span className="num font-semibold text-ink">{fmt(sel[1], 0)}</span> días de agua</p>
          <p className="text-ink-2"><span className="num font-semibold text-ink">{fmt(sel[2], 0)}%</span> de llenado</p>
        </div>
      )}
      <div className="sr-only"><table>
        <caption>{nombre}: días de agua por año (mínimo del año)</caption>
        <tbody>
          {Object.entries(serie.reduce<Record<string, number>>((acc, [f, d]) => {
            const a = f.slice(0, 4);
            acc[a] = Math.min(acc[a] ?? Infinity, d);
            return acc;
          }, {})).map(([a, d]) => <tr key={a}><th scope="row">{a}</th><td>{d} días</td></tr>)}
        </tbody>
      </table></div>
    </div>
  );
}
