"use client";

import { useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { useAncho } from "./useAncho";

type Props = {
  anual: { y: number; min: number }[];
  tipico: number;
  peores: number[];
};

const H = 260;
const M = { t: 20, r: 8, b: 28, l: 38 };

/** El punto más bajo de cada año. Los años más secos se marcan en rojo; el resto en neutro. */
export default function MinimosPresas({ anual, tipico, peores }: Props) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = anual.length;
  const paso = (W - M.l - M.r) / n;
  const ancho = Math.max(4, paso - (paso > 14 ? 4 : 2));
  const y = (v: number) => M.t + (1 - v / 100) * (H - M.t - M.b);
  const secos = new Set(peores);
  const sel = hover !== null ? anual[hover] : null;
  const cada = W < 560 ? 5 : 3; // cada cuántos años va una etiqueta; la última siempre, sin encimarse

  return (
    <div ref={ref} className="relative w-full min-w-0" style={{ minHeight: H }}>
      {W > 0 && <svg width={W} height={H} className="block touch-pan-y select-none" role="img"
        aria-label={`Nivel más bajo de las presas cada año, de ${anual[0].y} a ${anual[n - 1].y}. Los años más secos: ${peores.join(", ")}.`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.floor((e.clientX - r.left - M.l) / paso);
          setHover(i >= 0 && i < n ? i : null);
        }}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={M.l - 6} y={y(v)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[12px]">{v}%</text>
          </g>
        ))}
        {anual.map((a, i) => {
          const seco = secos.has(a.y);
          const cx = M.l + i * paso + paso / 2;
          return (
            <g key={a.y}>
              <rect x={cx - ancho / 2} y={y(a.min)} width={ancho} height={y(0) - y(a.min)} rx="3"
                fill={seco ? "var(--s-critico)" : "var(--line-strong)"} opacity={hover === null || hover === i ? 1 : 0.55} />
              {(i === n - 1 || (i % cada === 0 && n - 1 - i >= cada / 2)) && (
                <text x={cx} y={H - 9} textAnchor="middle" className="num fill-ink-3 text-[12px]">{a.y}</text>
              )}
            </g>
          );
        })}
        <line x1={M.l} x2={W - M.r} y1={y(tipico)} y2={y(tipico)} stroke="var(--ink)" strokeDasharray="4 4" />
        <text x={W - M.r} y={y(tipico) - 6} textAnchor="end" className="fill-ink text-[12px] font-semibold" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">
          año típico: {fmt(tipico, 0)}%
        </text>
      </svg>}
      {sel && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-surface px-3 py-2 text-[13px] shadow-[0_8px_24px_rgba(25,23,20,0.16)] ring-1 ring-black/5"
          style={{ left: Math.min(M.l + hover * paso + paso, W - 160) }}>
          <p className="num font-semibold">{sel.y}</p>
          <p className="text-ink-2">Punto más bajo: <span className="num font-semibold text-ink">{fmt(sel.min, 0)}%</span></p>
        </div>
      )}
      <table className="sr-only">
        <caption>Nivel más bajo de las presas por año</caption>
        <tbody>{anual.map((a) => <tr key={a.y}><th scope="row">{a.y}</th><td>{fmt(a.min, 0)}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}
