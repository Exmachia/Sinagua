/** Monitor de Sequía de México (SMN-CONAGUA), por municipio. */

/** Categorías: 0 sin sequía, 1 anormalmente seco (D0), 2–5 = sequía moderada a excepcional (D1–D4). */
export const CATEGORIAS = [
  { label: "Sin sequía", corto: "Sin sequía", color: "#ebe7df" },
  { label: "Anormalmente seco", corto: "Seco", color: "#f0d98e" },
  { label: "Sequía moderada", corto: "Moderada", color: "#e3a95a" },
  { label: "Sequía severa", corto: "Severa", color: "#cf7a3c" },
  { label: "Sequía extrema", corto: "Extrema", color: "#a3412e" },
  { label: "Sequía excepcional", corto: "Excepcional", color: "#651d20" },
] as const;

/** c: categoría hoy · r: quincenas seguidas en sequía · t: % del tiempo en sequía desde 2003 · p: habitantes ·
 *  h: últimas 48 quincenas, una cifra por quincena. */
export type SequiaMun = { c: number; r: number; t: number; p: number; h: string };
export type DatosSequia = { f: string; desde: string; m: Record<string, SequiaMun> };

export const enSequia = (c: number) => c >= 2;

/** "1 quincena", "3 meses", "1 año y 4 meses"… */
export function duracion(quincenas: number) {
  if (quincenas < 2) return `${quincenas} quincena`;
  const meses = Math.round(quincenas / 2);
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const a = Math.floor(meses / 12), m = meses % 12;
  return `${a} ${a === 1 ? "año" : "años"}${m ? ` y ${m} ${m === 1 ? "mes" : "meses"}` : ""}`;
}
