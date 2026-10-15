/**
 * Contenido de las tarjetas para compartir (Open Graph) y de las páginas /compartir/[tipo]/[clave].
 * Solo se usa en el servidor: importa los mismos JSON que el sitio, así las tarjetas se actualizan con los datos.
 */
import acuiferosJson from "../../public/data/acuiferos.json";
import estadosJson from "../../public/data/estados.json";
import municipiosJson from "../../public/data/municipios.json";
import presasJson from "../../public/data/presas.json";
import presasResumen from "@/data/presas_resumen.json";
import { albercas, ESTATUS_HEX, ESTATUS, fmt, type Acuifero, type Estado, type Municipio } from "@/lib/acuiferos";
import { fechaCorta, nivel, SIN_DATO, type Presa } from "@/lib/presas";

const acuiferos = acuiferosJson as unknown as Acuifero[];
const estados = estadosJson as unknown as Estado[];
const municipios = municipiosJson as unknown as Municipio[];
const presas = presasJson as unknown as Presa[];

export const TIPOS = ["acuifero", "municipio", "estado", "presa", "presas-estado"] as const;
export type Tipo = (typeof TIPOS)[number];

export type Tarjeta = {
  sobre: string; // línea superior (tipo · lugar)
  titulo: string; // nombre
  etiqueta?: { texto: string; color: string }; // pastilla de estatus
  cifra: string; // número grande
  cifraTexto: string; // qué significa
  frase?: string; // una línea en lenguaje llano
  barra?: { pct: number; color: string; marca?: number }; // barra de llenado (presas)
  destino: string; // a dónde lleva el enlace dentro del sitio
  descripcion: string; // meta description
};

const nombreEstado = new Map(estados.map((e) => [e.cve, e]));

export function tarjeta(tipo: string, clave: string): Tarjeta | null {
  if (tipo === "acuifero") {
    const a = acuiferos.find((x) => x.c === clave);
    if (!a) return null;
    const falta = a.dma < 0;
    const p = a.p !== null ? Math.round(a.p * 100) : null;
    const frase = p !== null ? `Por cada 100 litros que le entran al año, se permite sacar ${fmt(p, 0)}.` : undefined;
    return {
      sobre: `Acuífero · ${a.e}`,
      titulo: a.n,
      etiqueta: { texto: ESTATUS[a.s].label, color: ESTATUS_HEX[a.s] },
      cifra: a.dma === 0 ? "0" : fmt(albercas(a.dma), 0),
      cifraTexto: a.dma === 0 ? "agua disponible para nuevos permisos" : `albercas olímpicas ${falta ? "faltan" : "sobran"} cada año`,
      frase,
      destino: `/mapa#a=${a.c}`,
      descripcion: `${a.n} (${a.e}): ${ESTATUS[a.s].label.toLowerCase()}. ${frase ?? ""}`.trim(),
    };
  }
  if (tipo === "municipio") {
    const m = municipios.find((x) => x.g === clave);
    if (!m) return null;
    const e = nombreEstado.get(m.ent);
    const principal = acuiferos.find((a) => a.c === m.a[0]?.[0]);
    return {
      sobre: `Municipio · ${e?.e ?? ""}`,
      titulo: m.n,
      cifra: `${fmt(m.pct, 0)}%`,
      cifraTexto: "de su superficie está sobre acuíferos sobreexplotados",
      etiqueta: principal ? { texto: `Acuífero principal: ${principal.n} (${ESTATUS[principal.s].label.toLowerCase()})`, color: ESTATUS_HEX[principal.s] } : undefined,
      destino: `/mapa#m=${m.g}`,
      descripcion: `El ${fmt(m.pct, 0)}% de ${m.n} (${e?.e ?? ""}) está sobre acuíferos sobreexplotados. ¿Qué hay bajo tu municipio?`,
    };
  }
  if (tipo === "estado") {
    const e = estados.find((x) => x.slug === clave);
    if (!e) return null;
    return {
      sobre: "Estado · agua subterránea",
      titulo: e.e,
      cifra: `${fmt(e.pct, 0)}%`,
      cifraTexto: "de su territorio está sobre acuíferos sobreexplotados",
      frase: `${e.deficit} de sus ${e.total} acuíferos están sobreexplotados.`,
      destino: `/mapa#e=${e.slug}`,
      descripcion: `El ${fmt(e.pct, 0)}% de ${e.e} está sobre acuíferos sobreexplotados: ${e.deficit} de ${e.total}.`,
    };
  }
  if (tipo === "presa") {
    const p = presas.find((x) => x.c === clave);
    if (!p) return null;
    const color = p.reciente ? nivel(p.pct).color : SIN_DATO;
    const normal = p.normal !== null ? ` Lo normal para esta época: ${fmt(p.normal, 0)}%.` : "";
    return {
      sobre: `Presa · ${p.e}`,
      titulo: p.n,
      cifra: `${fmt(p.pct, 0)}%`,
      cifraTexto: `llena al ${fechaCorta(p.fecha)}`,
      barra: { pct: Math.min(p.pct, 100), color, marca: p.normal ?? undefined },
      frase: p.reciente ? normal.trim() || undefined : "Sin dato reciente de CONAGUA.",
      destino: `/presas#p=${p.c}`,
      descripcion: `La presa ${p.n} (${p.e}) está al ${fmt(p.pct, 0)}% al ${fechaCorta(p.fecha)}.${normal}`,
    };
  }
  if (tipo === "presas-estado") {
    const e = estados.find((x) => x.slug === clave);
    const r = e && presasResumen.estados.find((x) => x.cve === e.cve);
    if (!e || !r) return null;
    return {
      sobre: "Estado · presas",
      titulo: e.e,
      cifra: `${fmt(r.pct, 0)}%`,
      cifraTexto: `llenas, en promedio, al ${fechaCorta(presasResumen.ultima)}`,
      barra: { pct: Math.min(r.pct, 100), color: nivel(r.pct).color },
      frase: `${r.bajo20} de sus ${r.presas} presas están casi vacías (menos de 20%).`,
      destino: `/presas#e=${e.slug}`,
      descripcion: `Las presas de ${e.e} están al ${fmt(r.pct, 0)}% (${fechaCorta(presasResumen.ultima)}).`,
    };
  }
  return null;
}

/** Algunos ejemplos que se generan en el build; el resto se genera en la primera visita y se guarda. */
export const EJEMPLOS: { tipo: Tipo; clave: string }[] = [
  { tipo: "acuifero", clave: "0901" },
  { tipo: "municipio", clave: "11020" },
  { tipo: "estado", clave: "guanajuato" },
  { tipo: "presa", clave: "LDCJL" },
  { tipo: "presas-estado", clave: "sinaloa" },
];
