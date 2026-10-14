export type Presa = {
  c: string; // clave SIH
  n: string; // nombre común
  of: string; // nombre oficial
  e: string; // estado (nombre corto del sitio)
  ent: string; // clave INEGI del estado
  mun: string;
  reg: string; // región hidrológico-administrativa
  rio: string;
  inicio: string; // año de inicio de operación
  uso: string[]; // RI, AP, GH, CA
  lat: number;
  lon: number;
  cap: number; // capacidad al NAMO, hm³
  act: number; // almacenamiento más reciente, hm³
  pct: number; // % de llenado más reciente
  fecha: string;
  normal: number | null; // % normal para esta semana del año (mediana histórica)
  desde: string; // primer año con datos
  aviso: boolean; // >20% de registros inválidos en la fuente: fuera de los agregados
  reciente: boolean; // tiene dato del último mes respecto a la fecha de corte
};

export type Grupo = {
  presas: number;
  capacidad: number;
  semanal: [string, number][];
  anual: { y: number; min: number; media: number }[];
  normalSemana: Record<string, number>;
  tendenciaMin: number;
  tendenciaMedia: number;
  lineaMin: [[number, number], [number, number]];
  tMin: number; // |t| ≥ 2: la tendencia de los mínimos es distinguible del ruido
  minTipico: number; // mediana de los mínimos anuales
  peores: number[]; // los 6 años con el mínimo más bajo, del peor al menos malo
};

export type EstadoPresas = {
  cve: string;
  e: string;
  presas: number;
  pct: number; // % de llenado de sus presas (Σ almacenamiento / Σ capacidad)
  cap: number;
  bajo20: number;
  serie: number; // presas con historia continua (0 = sin gráfica)
};

export type PresasResumen = {
  ultima: string;
  desde: string;
  panelDesde: number;
  panel: number;
  capacidadPanel: number;
  usos: Record<string, string>;
  grupos: Record<string, Grupo>;
  estados: EstadoPresas[];
  actual: { presas: number; pct: number; bajo20: number; bajo50: number; debajoNormal: number };
};

/** Niveles de llenado como semáforo: rojo = casi vacía, verde = llena. */
export const NIVELES = [
  { desde: 0, key: "critico", label: "Menos de 20%", corto: "Crítica", color: "#8c3436" },
  { desde: 20, key: "bajo", label: "20–50%", corto: "Baja", color: "#d58b4b" },
  { desde: 50, key: "medio", label: "50–80%", corto: "Media", color: "#e7d17a" },
  { desde: 80, key: "lleno", label: "80% o más", corto: "Llena", color: "#32856c" },
] as const;

/** Presas sin dato reciente: gris, para no mezclar cifras viejas con actuales. */
export const SIN_DATO = "#bdb6aa";

export const nivel = (pct: number) => [...NIVELES].reverse().find((n) => pct >= n.desde)!;

/** Para qué se usa una presa, según la clasificación de CONAGUA. */
export const USO_CORTO: Record<string, string> = {
  AP: "Abastecer ciudades",
  RI: "Regar cultivos",
  GH: "Generar electricidad",
  CA: "Controlar inundaciones",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2024-05-31" → "mayo" */
export const mesLargo = (iso: string) => MESES_LARGOS[Number(iso.slice(5, 7)) - 1];

export function fechaCorta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
