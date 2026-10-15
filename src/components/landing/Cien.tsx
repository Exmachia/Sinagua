import { fmt } from "@/lib/acuiferos";
import { GRUPOS_USO, USO, type GrupoUso } from "@/lib/usos";

/**
 * De cada 100 litros: una cuadrícula de 10 × 10 en la que cada cuadro es un litro.
 * Los cuadros se reparten con el método del mayor residuo para que siempre sumen 100.
 */
export default function Cien({ grupos }: { grupos: Record<GrupoUso, number> }) {
  const total = GRUPOS_USO.reduce((s, g) => s + grupos[g], 0);
  const exactos = GRUPOS_USO.map((g) => (grupos[g] / total) * 100);
  const cuadros = exactos.map(Math.floor);
  const orden = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < 100 - cuadros.reduce((s, x) => s + x, 0); k++) cuadros[orden[k][1]]++;
  const celdas = GRUPOS_USO.flatMap((g, i) => Array.from({ length: cuadros[i] }, () => g));

  return (
    <figure>
      <div className="grid aspect-square w-full max-w-[420px] grid-cols-10 gap-[3px]" role="img"
        aria-label={`De cada 100 litros: ${GRUPOS_USO.map((g, i) => `${USO[g].label} ${cuadros[i]}`).join(", ")}.`}>
        {celdas.map((g, i) => (
          <div key={i} className="rounded-[3px]" style={{ background: USO[g].color }} />
        ))}
      </div>
      <figcaption>
        <ul className="mt-5 grid max-w-[420px] gap-2 text-[15px]">
          {GRUPOS_USO.map((g, i) => (
            <li key={g} className="flex items-center gap-3">
              <span aria-hidden className="size-3.5 shrink-0 rounded-[3px]" style={{ background: USO[g].color }} />
              <span className="min-w-0 flex-1">{USO[g].label}</span>
              <span className="num font-semibold">{cuadros[i]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-ink-3">Litros de cada 100 · {fmt(total / 1000, 0)} mil millones de m³ al año con permiso</p>
      </figcaption>
    </figure>
  );
}
