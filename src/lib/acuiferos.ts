export type Estatus = "disponible" | "limite" | "deficit" | "critico";

/** Un acuífero tal como lo produce scripts/build_data.py (claves cortas para pesar menos). */
export type Acuifero = {
  c: string; // clave CONAGUA
  n: string; // nombre
  e: string; // estado según CONAGUA
  r: number; // recarga media anual, hm³
  dnc: number; // descarga natural comprometida, hm³
  veas: number; // volumen concesionado, hm³
  dma: number; // disponibilidad media anual, hm³
  p: number | null; // presión = veas / (r − dnc)
  s: Estatus;
  ext15: number | null; // extracción estimada (DOF 2015)
  h: [anio: number, dma: number, veas: number][];
  b: Bbox;
  st: string[]; // claves INEGI de los estados que cruza
  pdf: string;
};

export type Municipio = {
  g: string; // CVEGEO
  n: string;
  ent: string; // clave INEGI del estado
  pct: number; // % de su superficie sobre acuíferos en déficit
  a: [clave: string, pct: number][]; // acuíferos bajo el municipio y % de su superficie
  b: Bbox;
};

export type Estado = {
  cve: string;
  e: string;
  slug: string;
  pct: number; // % del territorio sobre acuíferos en déficit
  km2: number;
  total: number;
  deficit: number;
  critico: number;
  hm3: number;
  b: Bbox;
  a: string[];
};

export type Bbox = [oeste: number, sur: number, este: number, norte: number];

/**
 * Lenguaje llano: "sobreexplotado" = los permisos para sacar agua superan el agua que entra cada año
 * (en términos de CONAGUA: disponibilidad negativa, "déficit"). El "?" de cada mapa lo explica.
 */
export const ESTATUS: Record<Estatus, { label: string; corto: string; color: string; desc: string }> = {
  disponible: {
    label: "Con agua disponible",
    corto: "Disponible",
    color: "var(--s-disponible)",
    desc: "Se permite sacar menos del 60% del agua que entra cada año.",
  },
  limite: {
    label: "Casi al límite",
    corto: "Al límite",
    color: "var(--s-limite)",
    desc: "Se permite sacar entre 60% y 100% del agua que entra cada año.",
  },
  deficit: {
    label: "Sobreexplotado",
    corto: "Sobreexplotado",
    color: "var(--s-deficit)",
    desc: "Se permite sacar más agua de la que entra cada año.",
  },
  critico: {
    label: "Muy sobreexplotado",
    corto: "Muy sobreexplotado",
    color: "var(--s-critico)",
    desc: "Se permite sacar 1.5 veces o más el agua que entra cada año.",
  },
};

export const ORDEN: Estatus[] = ["critico", "deficit", "limite", "disponible"];

/** Colores literales para MapLibre (no entiende variables CSS). */
export const ESTATUS_HEX: Record<Estatus, string> = {
  disponible: "#32856c",
  limite: "#e7d17a",
  deficit: "#d58b4b",
  critico: "#8c3436",
};

/** % de territorio sobre acuíferos sobreexplotados, como semáforo (mismos colores que el estatus). */
export const RAMPA: { desde: number; color: string; label: string }[] = [
  { desde: 0, color: "#32856c", label: "Menos de 10%" },
  { desde: 10, color: "#e7d17a", label: "10–40%" },
  { desde: 40, color: "#d58b4b", label: "40–70%" },
  { desde: 70, color: "#8c3436", label: "70% o más" },
];

export const colorPct = (pct: number) => [...RAMPA].reverse().find((r) => pct >= r.desde)!.color;

const nf = (d: number) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: d });
export const fmt = (n: number, d = 1) => nf(d).format(n);

/** Volumen en palabras: 61.6 hm³ → "61.6 millones de m³" (1 hm³ = un millón de m³ = mil millones de litros). */
export const volumen = (hm3: number, d = 1) => `${fmt(Math.abs(hm3), d)} millones de m³`;

/** 1 hm³ = 1,000,000 m³; una alberca olímpica ≈ 2,500 m³ → 400 albercas por hm³. */
export const albercas = (hm3: number) => Math.round(Math.abs(hm3) * 400);

export function normaliza(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Frase en lenguaje llano: cuánto se permite sacar por cada 100 litros que entran. */
export function fraseLitros(a: Acuifero) {
  if (a.p === null) {
    return a.veas > 0
      ? "Toda el agua que le entra ya está apartada para ríos y manantiales: cualquier litro que se saque es de más."
      : "No tiene agua que entre cada año registrada.";
  }
  return `Por cada 100 litros que le entran al año, se permite sacar ${fmt(Math.round(a.p * 100), 0)}.`;
}
