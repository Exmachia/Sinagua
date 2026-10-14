"use client";

import { useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { fechaCorta } from "@/lib/presas";
import { useAncho } from "./useAncho";

type Punto = { f: string; pct: number; severa: number };
type Props = { serie: Punto[] };

const H = 300;
const M = { t: 20, r: 12, b: 30, l: 40 };

/** % de la población que vive en un municipio con sequía (D1–D4), mes a mes desde 2003. Más de 50% se marca en rojo. */
export default function SequiaChart({ serie }: Props) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const t = serie.map((s) => Date.parse(s.f));
  const t0 = t[0];
  const t1 = t[t.length - 1];
  const x = (ms: number) => M.l + ((ms - t0) / (t1 - t0)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v / 100) * (H - M.t - M.b);
  const ancho = Math.max(1, (W - M.l - M.r) / serie.length - 0.6);
  const anios = [2005, 2010, 2015, 2020, 2025].filter((a) => Date.UTC(a, 0, 1) >= t0 && Date.UTC(a, 0, 1) <= t1);
  const sel = hover !== null ? serie[hover] : null;

  return (
    <div ref={ref} className="relative w-full min-w-0" style={{ minHeight: H }}>
      {W > 0 && (
        <svg width={W} height={H} className="block touch-pan-y select-none" role="img"
          aria-label={`Porcentaje de mexicanos que viven en sequía, de ${serie[0].f.slice(0, 4)} a ${serie[serie.length - 1].f.slice(0, 4)}.`}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const ms = t0 + ((e.clientX - r.left - M.l) / (W - M.l - M.r)) * (t1 - t0);
            let i = 0;
            while (i < t.length - 1 && t[i + 1] <= ms) i++;
            setHover(i);
          }}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={v === 50 ? "var(--ink-3)" : "var(--line)"} strokeDasharray={v === 50 ? "4 4" : undefined} />
              <text x={M.l - 6} y={y(v)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[12px]">{v}%</text>
            </g>
          ))}
          {serie.map((s, i) => (
            <rect key={s.f} x={x(t[i]) - ancho / 2} y={y(s.pct)} width={ancho} height={y(0) - y(s.pct)}
              fill={s.pct >= 50 ? "var(--s-critico)" : "var(--s-deficit)"} opacity={hover === null || hover === i ? (s.pct >= 50 ? 0.95 : 0.55) : 0.3} />
          ))}
          <text x={M.l + 6} y={y(50) - 6} textAnchor="start" className="fill-ink-2 text-[12px] font-semibold" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">
            la mitad del país
          </text>
          {anios.map((a) => (
            <text key={a} x={x(Date.UTC(a, 0, 1))} y={H - 8} textAnchor="middle" className="num fill-ink-3 text-[12px]">{a}</text>
          ))}
        </svg>
      )}
      {sel && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-surface px-3 py-2 text-[13px] shadow-[0_8px_24px_rgba(25,23,20,0.16)] ring-1 ring-black/5"
          style={{ left: Math.min(Math.max(x(t[hover]) + 10, 0), W - 200) }}>
          <p className="font-semibold">{fechaCorta(sel.f).replace(/^\d+ /, "")}</p>
          <p className="text-ink-2"><span className="num font-semibold text-ink">{fmt(sel.pct, 0)}%</span> de los mexicanos en sequía</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Porcentaje de la población en sequía, por mes</caption>
        <tbody>{serie.filter((_, i) => i % 6 === 0).map((s) => <tr key={s.f}><th scope="row">{s.f}</th><td>{fmt(s.pct, 0)}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}
