/** ¿Quién usa el agua? (REPDA) y ¿se puede usar? (calidad del agua). Tipos y lenguaje llano. */

export type GrupoUso = "campo" | "ciudades" | "industria" | "electricidad" | "varios";
export const GRUPOS_USO: GrupoUso[] = ["campo", "ciudades", "industria", "electricidad", "varios"];

/** Paleta categórica validada (daltonismo y contraste); "varios" es neutro a propósito. */
export const USO: Record<GrupoUso, { label: string; corto: string; color: string; sujeto: string }> = {
  campo: { label: "Campo (riego y ganado)", corto: "Campo", color: "#a8762a", sujeto: "El campo se lleva" },
  ciudades: { label: "Ciudades y casas", corto: "Ciudades", color: "#2a78d6", sujeto: "Las ciudades se llevan" },
  industria: { label: "Industria y comercios", corto: "Industria", color: "#b4507e", sujeto: "La industria se lleva" },
  electricidad: { label: "Plantas de electricidad", corto: "Electricidad", color: "#5b4a9e", sujeto: "Las plantas de electricidad se llevan" },
  varios: { label: "Varios usos a la vez", corto: "Varios", color: "#8a8478", sujeto: "Los permisos de varios usos se llevan" },
};

/** Resumen de un lugar: volumen total, por grupo (en el orden de GRUPOS_USO), particulares y principales titulares. */
export type UsoLugar = { v: number; g: number[]; p: number; n: number; t: [string, number][] };
export type UsosEstado = { e: UsoLugar; m: Record<string, UsoLugar> };

/** El grupo que más agua se lleva y cuántos de cada 100 litros. */
export function mayor(u: UsoLugar) {
  const i = u.g.indexOf(Math.max(...u.g));
  return { grupo: GRUPOS_USO[i], de100: Math.round((u.g[i] / u.v) * 100) };
}

export type Semaforo = "r" | "a" | "v";
export const SEMAFORO: Record<Semaforo, { label: string; color: string }> = {
  r: { label: "Contaminada", color: "#8c3436" },
  a: { label: "Con problemas", color: "#e7d17a" },
  v: { label: "Cumple", color: "#32856c" },
};
export type ResumenCalidad = { n: number; r: number; a: number; v: number; q: [string, number][] };

/** Lo que se encontró, explicado. */
export const QUE_ES: Record<string, string> = {
  heces: "bacterias de heces",
  "aguas negras": "aguas negras",
  lodo: "lodo y sólidos",
  "tóxicos": "sustancias tóxicas",
  "arsénico": "arsénico",
  "flúor": "exceso de flúor",
  nitratos: "nitratos (fertilizantes)",
  metales: "metales pesados",
  sales: "exceso de sales",
};

export type SitioCalidad = { c: string; n: string; cve: string; mun: string; cuerpo: string; t: "superficie" | "pozo"; y: number; s: Semaforo; q: string };
