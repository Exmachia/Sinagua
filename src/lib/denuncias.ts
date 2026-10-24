import datos from "@/data/denuncias.json";
import estadosJson from "../../public/data/estados.json";

export type Denuncia = { id: string; estado: string; estadoNombre: string; municipio: string; fecha: string; mensaje: string };

const NOMBRE = new Map(estadosJson.map((e) => [e.cve, e.e]));
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Las más nuevas primero. */
export const DENUNCIAS: Denuncia[] = datos.denuncias
  .map((d) => ({ ...d, estadoNombre: NOMBRE.get(d.estado) ?? d.estado }))
  .sort((a, b) => b.fecha.localeCompare(a.fecha));

/** "23 oct 2026", o "octubre de 2026" si solo se sabe el mes. */
export function fechaDenuncia(f: string) {
  const [y, m, d] = f.split("-").map(Number);
  if (!d) return `${MESES[m - 1]} de ${y}`;
  return `${d} ${MESES[m - 1].slice(0, 3)} ${y}`;
}
