/** Datos oficiales que acompañan a cada artículo, calculados con los mismos archivos del sitio. Solo servidor. */
import acuiferosJson from "../../public/data/acuiferos.json";
import estadosJson from "../../public/data/estados.json";
import calidad from "@/data/calidad.json";
import resumen from "@/data/resumen.json";
import { ESTATUS, fmt, fraseLitros, type Acuifero, type Estado } from "./acuiferos";

export type DatoPedido =
  | { tipo: "acuifero"; clave: string }
  | { tipo: "acuiferos-estado"; estado: string }
  | { tipo: "calidad-superficie"; estado: string }
  | { tipo: "calidad-pozo"; estado: string };

export type DatoOficial = { valor: string; texto: string; fuente: string; color?: string };

const acuiferos = new Map((acuiferosJson as unknown as Acuifero[]).map((a) => [a.c, a]));
const estados = new Map((estadosJson as unknown as Estado[]).map((e) => [e.cve, e]));
type Res = { n: number; r: number };
const cal = calidad.estados as unknown as Record<string, { superficie?: Res; pozo?: Res }>;
const anios = calidad.anios.join(" y ");

export function datoOficial(d: DatoPedido): DatoOficial | null {
  if (d.tipo === "acuifero") {
    const a = acuiferos.get(d.clave);
    if (!a) return null;
    return {
      valor: ESTATUS[a.s].label,
      texto: `Acuífero ${a.n}. ${fraseLitros(a)}`,
      fuente: `CONAGUA, ${resumen.anio}`,
      color: ESTATUS[a.s].color,
    };
  }
  if (d.tipo === "acuiferos-estado") {
    const e = estados.get(d.estado);
    if (!e) return null;
    return { valor: `${e.deficit} de ${e.total}`, texto: `acuíferos de ${e.e} están sobreexplotados (${fmt(e.pct, 0)}% de su territorio).`, fuente: `CONAGUA, ${resumen.anio}` };
  }
  const r = cal[d.estado]?.[d.tipo === "calidad-superficie" ? "superficie" : "pozo"];
  const e = estados.get(d.estado);
  if (!r || !e) return null;
  return d.tipo === "calidad-superficie"
    ? { valor: `${r.r} de ${r.n}`, texto: `ríos, lagos y presas medidos en ${e.e} están contaminados.`, fuente: `CONAGUA, calidad del agua ${anios}` }
    : { valor: `${r.r} de ${r.n}`, texto: `pozos medidos en ${e.e} no sirven para beber sin tratarla.`, fuente: `CONAGUA, calidad del agua ${anios}` };
}
