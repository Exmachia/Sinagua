"use client";

import { useState } from "react";
import { fmt } from "@/lib/acuiferos";

type Props = { h: [number, number, number][] };

const W = 340;
const H = 168;
const M = { t: 18, r: 14, b: 26, l: 46 };

/** Agua que sobra (+) o falta (−) por revisión oficial (disponibilidad, DMA). Una serie: el título la nombra. */
export default function HistoryChart({ h }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  if (h.length < 2) return null;

  const years = h.map((d) => d[0]);
  const vals = h.map((d) => d[1]);
  const x0 = years[0];
  const x1 = years[years.length - 1];
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const pad = (hi - lo || 1) * 0.12;
  lo -= lo < 0 ? pad : 0;
  hi += hi > 0 ? pad : pad * 0.4;

  const x = (y: number) => M.l + ((y - x0) / (x1 - x0)) * (W - M.l - M.r);
  const y = (v: number) => M.t + ((hi - v) / (hi - lo)) * (H - M.t - M.b);
  const path = h.map((d, i) => `${i ? "L" : "M"}${x(d[0]).toFixed(1)},${y(d[1]).toFixed(1)}`).join("");
  const zeroY = y(0);
  // Ticks en los extremos solo si no se enciman con el cero.
  const lejos = (v: number) => Math.abs(v) > (hi - lo) * 0.25;
  const ticks = [hi - pad, 0, lo + pad].filter((t, i) => i === 1 || lejos(t));
  const sel = hover ?? h.length - 1;
  const d = h[sel];

  return (
    <figure className="mt-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">Agua que sobra o falta · millones de m³</span>
        <span className="num text-[13px] text-ink-2">
          {d[0]}: <span className="text-ink">{d[1] > 0 ? "+" : ""}{fmt(d[1])}</span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-none select-none"
        aria-hidden
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          h.forEach((p, i) => {
            if (Math.abs(x(p[0]) - px) < Math.abs(x(h[best][0]) - px)) best = i;
          });
          setHover(best);
        }}
      >
        {/* zona en la que falta agua */}
        {lo < 0 && (
          <rect x={M.l} y={zeroY} width={W - M.l - M.r} height={H - M.b - zeroY} fill="var(--s-deficit)" opacity="0.12" />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? "0" : "2 4"} />
            <text x={M.l - 8} y={y(t)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[10px]">
              {fmt(t, 0)}
            </text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={zeroY} y2={zeroY} stroke="var(--line-strong)" />
        {lo < 0 && (
          <text x={M.l + 4} y={zeroY + 12} textAnchor="start" className="fill-ink-3 text-[10px]">
            falta
          </text>
        )}
        {years.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" className="num fill-ink-3 text-[10px]">
            {yr}
          </text>
        ))}
        <line x1={x(d[0])} x2={x(d[0])} y1={M.t - 6} y2={H - M.b} stroke="var(--line-strong)" />
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h.map((p, i) => (
          <circle
            key={p[0]}
            cx={x(p[0])}
            cy={y(p[1])}
            r={i === sel ? 5.5 : 4}
            fill={p[1] < 0 ? "var(--s-critico)" : "var(--s-disponible)"}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <table className="sr-only">
        <caption>Agua que sobra (positivo) o falta (negativo) cada año, en millones de metros cúbicos, por revisión oficial</caption>
        <tbody>
          {h.map((p) => (
            <tr key={p[0]}>
              <th scope="row">{p[0]}</th>
              <td>{fmt(p[1])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
