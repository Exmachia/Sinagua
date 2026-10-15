/**
 * /urgente: lo más crítico del agua esta semana. Las alertas salen solas de los datos (mismas reglas para todos los
 * lugares) y se recalculan con cada actualización; los casos destacados se agregan a mano en src/data/casos.json.
 * Regla de frescura: ninguna alerta con datos de más de VIGENCIA días; los casos a mano caducan igual si no se renuevan.
 * Solo se usa en el servidor (página, imágenes para historias).
 */
import casosJson from "@/data/casos.json";
import diasAgua from "@/data/dias_agua.json";
import estadosJson from "../../public/data/estados.json";
import presasJson from "../../public/data/presas.json";
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
  historia?: { texto: string; datos: string[] }; // versión corta para la imagen que se comparte
  datosOficiales?: { texto: string; fuente: string }[];
  fuentes?: { nombre: string; url: string }[];
  accion?: string;
  fecha: string; // de cuándo son los datos (AAAA-MM-DD)
  peso: number; // para ordenar: más alto, más grave
};

/** Días que una alerta puede mostrarse después de la fecha de sus datos. */
export const VIGENCIA = 31;

const estados = estadosJson as unknown as Estado[];
const presas = presasJson as unknown as Presa[];
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
      fecha: p.fecha,
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
      fecha: sequia.f,
      peso: pct,
    });
  }
  return out;
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
      fecha: s.actual.f,
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
    historia: c.historia,
    datosOficiales: c.datos,
    fuentes: c.fuentes,
    accion: c.accion,
    fecha: c.fecha,
    peso: 1000,
  }));
}

/** Todas las alertas vigentes a la fecha `hoy`, de la más grave a la menos. Las automáticas se limitan para no saturar. */
export function alertas(hoy: Date): Alerta[] {
  const limite = new Date(hoy.getTime() - VIGENCIA * 864e5).toISOString().slice(0, 10);
  const vigente = (a: Alerta) => a.fecha >= limite;
  const auto = [...diasCriticos(), ...presasVacias(), ...estadosEnSequia()]
    .filter(vigente)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 8);
  return [...reportes().filter(vigente), ...auto];
}

export const alerta = (id: string, hoy: Date) => alertas(hoy).find((a) => a.id === id) ?? null;
