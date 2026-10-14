"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/acuiferos";
import { fechaCorta } from "@/lib/presas";

type Props = {
  datos: [string, number][]; // [fecha ISO, valor]
  titulo: string;
  unidad?: string; // "%" o "hm³"
  max?: number; // tope del eje y (100 para %)
  color?: string;
  /** Línea de referencia horizontal (p. ej. la tendencia o un umbral). */
  referencia?: { valor: number; label: string };
  /** Tendencia lineal de los mínimos anuales: se dibuja como recta punteada. */
  tendencia?: [inicio: [number, number], fin: [number, number]];
  alto?: number;
};

const W = 360;
const M = { t: 12, r: 10, b: 22, l: 34 };

/** Serie de tiempo con área, eje anual y cursor con valor. Una serie: el título la nombra. */
export default function SerieChart({ datos, titulo, unidad = "%", max, color = "var(--agua)", referencia, tendencia, alto = 150 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const H = alto;

  const g = useMemo(() => {
    const t = datos.map(([f]) => Date.parse(f));
    const t0 = t[0];
    const t1 = t[t.length - 1];
    const tope = max ?? Math.max(...datos.map((d) => d[1])) * 1.08;
    const x = (ms: number) => M.l + ((ms - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
    const y = (v: number) => M.t + (1 - v / (tope || 1)) * (H - M.t - M.b);
    const linea = datos.map((d, i) => `${i ? "L" : "M"}${x(t[i]).toFixed(1)},${y(d[1]).toFixed(1)}`).join("");
    const area = `${linea}L${x(t1).toFixed(1)},${y(0)}L${x(t0).toFixed(1)},${y(0)}Z`;
    const a0 = new Date(t0).getUTCFullYear();
    const a1 = new Date(t1).getUTCFullYear();
    const paso = a1 - a0 > 20 ? 10 : a1 - a0 > 8 ? 5 : 2;
    const anios: number[] = [];
    for (let a = Math.ceil(a0 / paso) * paso; a <= a1; a += paso) anios.push(a);
    const yTicks = max === 100 ? [0, 50, 100] : [0, tope / 2, tope].map((v) => Math.round(v));
    return { t, x, y, linea, area, anios, yTicks, tope };
  }, [datos, max, H]);

  if (datos.length < 2) return null;
  const sel = hover ?? datos.length - 1;
  const [fSel, vSel] = datos[sel];
  const xa = (a: number) => g.x(Date.UTC(a, 0, 1));

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold">{titulo}</span>
        <span className="num text-[13px] text-ink-2">
          {fechaCorta(fSel)}: <strong className="font-semibold text-ink">{fmt(vSel, unidad === "%" ? 0 : 1)}{unidad === "%" ? "%" : ` ${unidad}`}</strong>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-pan-y select-none"
        aria-hidden
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const ms = g.t[0] + ((px - M.l) / (W - M.l - M.r)) * (g.t[g.t.length - 1] - g.t[0]);
          let lo = 0;
          let hi = g.t.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (g.t[mid] < ms) lo = mid + 1;
            else hi = mid;
          }
          setHover(Math.max(0, Math.min(datos.length - 1, lo)));
        }}
      >
        {g.yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={g.y(v)} y2={g.y(v)} stroke={v === 0 ? "var(--line-strong)" : "var(--line)"} />
            <text x={M.l - 6} y={g.y(v)} dy="0.35em" textAnchor="end" className="num fill-ink-3 text-[10px]">
              {fmt(v, 0)}{unidad === "%" ? "%" : ""}
            </text>
          </g>
        ))}
        {g.anios.map((a) => (
          <text key={a} x={xa(a)} y={H - 6} textAnchor="middle" className="num fill-ink-3 text-[10px]">{a}</text>
        ))}
        <path d={g.area} fill={color} opacity="0.14" />
        <path d={g.linea} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {referencia && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={g.y(referencia.valor)} y2={g.y(referencia.valor)} stroke="var(--ink-2)" strokeDasharray="3 3" />
            <text x={M.l + 4} y={g.y(referencia.valor) - 4} className="fill-ink-2 text-[10px] font-semibold"
              stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">{referencia.label}</text>
          </g>
        )}
        {tendencia && (
          <line x1={xa(tendencia[0][0])} y1={g.y(tendencia[0][1])} x2={xa(tendencia[1][0])} y2={g.y(tendencia[1][1])}
            stroke="var(--s-critico)" strokeWidth="2" strokeDasharray="5 4" />
        )}
        <line x1={g.x(g.t[sel])} x2={g.x(g.t[sel])} y1={M.t} y2={H - M.b} stroke="var(--ink-3)" strokeWidth="1" />
        <circle cx={g.x(g.t[sel])} cy={g.y(vSel)} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
      </svg>
      <table className="sr-only">
        <caption>{titulo}: un valor por año (primera semana)</caption>
        <tbody>
          {datos.filter((_, i) => i === 0 || datos[i][0].slice(0, 4) !== datos[i - 1][0].slice(0, 4)).map(([f, v]) => (
            <tr key={f}><th scope="row">{f}</th><td>{fmt(v, 1)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
