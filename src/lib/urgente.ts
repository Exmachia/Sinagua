/**
 * /urgente: lo más crítico del agua esta semana. Las alertas salen solas de los datos (mismas reglas para todos los
 * lugares) y se recalculan con cada actualización; los casos destacados se agregan a mano en src/data/casos.json.
 * Solo se usa en el servidor (página, imágenes para historias).
 */
import casosJson from "@/data/casos.json";
import diasAgua from "@/data/dias_agua.json";
import estadosJson from "../../public/data/estados.json";
import presasJson from "../../public/data/presas.json";
import calidadPresasJson from "../../public/data/calidad_presas.json";
import sequiaJson from "../../public/data/sequia_mun.json";
import municipiosJson from "../../public/data/municipios.json";
import { fmt, type Estado, type Municipio } from "./acuiferos";
import { fechaCorta, type Presa } from "./presas";
import { duracion, enSequia, type DatosSequia } from "./sequia";

export type Dato = { valor: string; texto: string };
export type Alerta = {
  id: string;
  tipo: "presa" | "sequia" | "contaminacion" | "dias" | "reporte";
  etiqueta: string; // "Presa casi vacía", "Lo que reportan vecinos y medios"…
  lugar: string; // a quién le pasa (va en el llamado: "Monterrey necesita que se sepa")
  estado: string;
  titulo: string;
  datos: Dato[];
  fuente: string;
  destino: string; // dónde ver más en el sitio
  // Solo en reportes:
  reporte?: string;
  datosOficiales?: { texto: string; fuente: string }[];
  fuentes?: { nombre: string; url: string }[];
  accion?: string;
  peso: number; // para ordenar: más alto, más grave
};

const estados = estadosJson as unknown as Estado[];
const presas = presasJson as unknown as Presa[];
const calidadPresas = calidadPresasJson as unknown as Record<string, { s: "r" | "a" | "v"; q: string[]; y: number }>;
const sequia = sequiaJson as unknown as DatosSequia;
const municipios = new Map((municipiosJson as unknown as Municipio[]).map((m) => [m.g, m]));
const porCve = new Map(estados.map((e) => [e.cve, e]));
const abasteceCiudades = (p: Presa) => ((p.uso ?? []) as string[]).includes("AP");

/** Presas que abastecen ciudades, casi vacías y muy por debajo de lo normal. */
function presasVacias(): Alerta[] {
  return presas
    .filter((p) => p.reciente && !p.aviso && abasteceCiudades(p) && p.pct < 20 && (p.normal === null || p.pct <= p.normal - 5))
    .map((p) => ({
      id: `presa-${p.c}`,
      tipo: "presa" as const,
      etiqueta: "Presa que da agua a ciudades",
      lugar: p.mun ? `${p.mun}, ${p.e}` : p.e,
      estado: p.e,
      titulo: `La presa ${p.n} está al ${fmt(p.pct, 0)}%`,
      datos: [
        ...(p.normal !== null ? [{ valor: `${fmt(p.normal, 0)}%`, texto: "es lo normal en esta época del año" }] : []),
        { valor: `${fmt(p.cap, 0)} millones de m³`, texto: `de capacidad; hoy le quedan ${fmt((p.cap * p.pct) / 100, 0)}` },
      ],
      fuente: `CONAGUA, monitoreo de presas, al ${fechaCorta(p.fecha)}`,
      destino: `/presas#p=${p.c}`,
      peso: 100 - p.pct + (p.normal !== null ? (p.normal - p.pct) / 2 : 0),
    }));
}

/** Estados donde más de la mitad de la gente vive en sequía. */
function estadosEnSequia(): Alerta[] {
  const out: Alerta[] = [];
  for (const e of estados) {
    const lista = Object.entries(sequia.m).filter(([g]) => g.startsWith(e.cve));
    const pob = lista.reduce((s, [, x]) => s + x.p, 0);
    const enSeq = lista.filter(([, x]) => enSequia(x.c));
    const pct = pob ? (enSeq.reduce((s, [, x]) => s + x.p, 0) / pob) * 100 : 0;
    if (pct < 50) continue;
    const masLarga = enSeq.sort((a, b) => b[1].r - a[1].r)[0];
    out.push({
      id: `sequia-${e.slug}`,
      tipo: "sequia",
      etiqueta: "Sequía",
      lugar: e.e,
      estado: e.e,
      titulo: `${fmt(pct, 0)}% de la gente de ${e.e} vive en sequía`,
      datos: [
        { valor: `${enSeq.length} de ${lista.length}`, texto: "municipios en sequía" },
        ...(masLarga ? [{ valor: duracion(masLarga[1].r), texto: `seguidos en sequía en ${municipios.get(masLarga[0])?.n ?? "un municipio"}` }] : []),
      ],
      fuente: `Monitor de Sequía de México (SMN), al ${fechaCorta(sequia.f)}`,
      destino: `/sequia#e=${e.slug}`,
      peso: pct,
    });
  }
  return out;
}

/** Presas que abastecen ciudades con el agua contaminada (una sola alerta nacional). */
function presasContaminadas(): Alerta[] {
  const rojas = presas.filter((p) => abasteceCiudades(p) && calidadPresas[p.c]?.s === "r");
  if (rojas.length < 3) return [];
  const ejemplos = rojas.slice(0, 3).map((p) => p.n).join(", ");
  return [{
    id: "presas-contaminadas",
    tipo: "contaminacion",
    etiqueta: "Agua contaminada",
    lugar: "México",
    estado: "Todo el país",
    titulo: `${rojas.length} presas que dan agua a ciudades están contaminadas`,
    datos: [
      { valor: "Aguas negras", texto: "lo que más se encontró" },
      { valor: ejemplos, texto: "algunas de ellas" },
    ],
    fuente: "CONAGUA, Red Nacional de Medición de Calidad del Agua (2021–2023)",
    destino: "/#calidad",
    peso: 60 + rojas.length,
  }];
}

/** Sistemas de presas de grandes ciudades con menos de 6 meses de agua. */
function diasCriticos(): Alerta[] {
  return diasAgua.sistemas
    .filter((s) => s.actual.dias < 180)
    .map((s) => ({
      id: `dias-${s.id}`,
      tipo: "dias" as const,
      etiqueta: "Se acaba el agua",
      lugar: s.ciudad,
      estado: s.ciudad,
      titulo: `Al ${s.nombre} le quedan ${s.actual.dias} días de agua`,
      datos: [
        { valor: String(s.actual.dias), texto: "días de agua si dejara de llover" },
        { valor: `${fmt(s.actual.pct, 0)}%`, texto: "de llenado" },
      ],
      fuente: "CONAGUA, Sistema de Información Hidrológica",
      destino: "/#dias",
      peso: 200 - s.actual.dias / 2,
    }));
}

/** Casos destacados (a mano, con fuente). */
function reportes(): Alerta[] {
  return casosJson.casos.map((c) => ({
    id: c.id,
    tipo: "reporte" as const,
    etiqueta: "Lo que reportan vecinos y medios",
    lugar: c.lugar,
    estado: porCve.get(c.municipio.slice(0, 2))?.e ?? "",
    titulo: c.titulo,
    datos: [],
    fuente: c.fuentes.map((f) => f.nombre).join(" · "),
    destino: `/mapa#e=${c.estado}&m=${c.municipio}`,
    reporte: c.reporte,
    datosOficiales: c.datos,
    fuentes: c.fuentes,
    accion: c.accion,
    peso: 1000,
  }));
}

/** Todas las alertas, de la más grave a la menos. Las automáticas se limitan para no saturar. */
export function alertas(): Alerta[] {
  const auto = [...diasCriticos(), ...presasVacias(), ...estadosEnSequia(), ...presasContaminadas()]
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 8);
  return [...reportes(), ...auto];
}

export const alerta = (id: string) => alertas().find((a) => a.id === id) ?? null;
