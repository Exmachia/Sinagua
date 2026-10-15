/**
 * Contenido de las tarjetas para compartir (Open Graph) y de las páginas /compartir/[tipo]/[clave].
 * Solo se usa en el servidor: importa los mismos JSON que el sitio, así las tarjetas se actualizan con los datos.
 */
import acuiferosJson from "../../public/data/acuiferos.json";
import estadosJson from "../../public/data/estados.json";
import municipiosJson from "../../public/data/municipios.json";
import presasJson from "../../public/data/presas.json";
import presasResumen from "@/data/presas_resumen.json";
import diasAgua from "@/data/dias_agua.json";
import usosEstados from "@/data/usos_estados.json";
import sequiaJson from "../../public/data/sequia_mun.json";
import municipiosNombres from "../../public/data/municipios.json";
import { GRUPOS_USO, mayor, USO, type UsoLugar } from "@/lib/usos";
import { CATEGORIAS, duracion, enSequia, type DatosSequia } from "@/lib/sequia";
import { albercas, ESTATUS_HEX, ESTATUS, fmt, type Acuifero, type Estado, type Municipio } from "@/lib/acuiferos";
import { fechaCorta, mesLargo, nivel, SIN_DATO, type Presa } from "@/lib/presas";

const acuiferos = acuiferosJson as unknown as Acuifero[];
const estados = estadosJson as unknown as Estado[];
const municipios = municipiosJson as unknown as Municipio[];
const presas = presasJson as unknown as Presa[];

export const TIPOS = ["acuifero", "municipio", "estado", "presa", "presas-estado", "dias", "usos-estado", "sequia-estado", "sequia-municipio"] as const;
export type Tipo = (typeof TIPOS)[number];

export type Tarjeta = {
  sobre: string; // línea superior (tipo · lugar)
  titulo: string; // nombre
  etiqueta?: { texto: string; color: string }; // pastilla de estatus
  cifra: string; // número grande
  cifraTexto: string; // qué significa
  frase?: string; // una línea en lenguaje llano
  barra?: { pct: number; color: string; marca?: number }; // barra de llenado (presas)
  segmentos?: { pct: number; color: string; label: string }[]; // barra de varios colores con su leyenda
  destino: string; // a dónde lleva el enlace dentro del sitio
  boton?: string; // texto del enlace en /compartir (por defecto "Ver en el mapa")
  descripcion: string; // meta description
};

const nombreEstado = new Map(estados.map((e) => [e.cve, e]));
const sequia = sequiaJson as unknown as DatosSequia;
const munNombres = new Map((municipiosNombres as unknown as Municipio[]).map((m) => [m.g, m.n]));

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
      sobre: "Estado · acuíferos",
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
  if (tipo === "usos-estado") {
    const e = estados.find((x) => x.slug === clave);
    const u = e && (usosEstados as unknown as Record<string, UsoLugar>)[e.cve];
    if (!e || !u || u.v <= 0) return null;
    const m = mayor(u);
    const ciudades = Math.round((u.g[GRUPOS_USO.indexOf("ciudades")] / u.v) * 100);
    const quien = USO[m.grupo].sujeto.replace(/ se llevan?$/, "").toLowerCase();
    return {
      sobre: `¿Quién se lleva el agua? · ${e.e}`,
      titulo: e.e,
      cifra: String(m.de100),
      cifraTexto: `de cada 100 litros con permiso son para ${quien}`,
      segmentos: GRUPOS_USO.map((g, i) => ({ pct: (u.g[i] / u.v) * 100, color: USO[g].color, label: USO[g].corto })),
      frase: m.grupo === "ciudades" ? undefined : `A las ciudades y las casas les tocan ${ciudades}.`,
      destino: `/mapa#e=${e.slug}`,
      boton: "Ver quién la usa",
      descripcion: `En ${e.e}, ${m.de100} de cada 100 litros de agua con permiso son para ${quien}. A las ciudades les tocan ${ciudades}.`,
    };
  }
  if (tipo === "sequia-estado") {
    const e = estados.find((x) => x.slug === clave);
    if (!e) return null;
    const lista = Object.entries(sequia.m).filter(([g]) => g.startsWith(e.cve));
    const pob = lista.reduce((s, [, x]) => s + x.p, 0);
    const pobSeq = lista.reduce((s, [, x]) => s + (enSequia(x.c) ? x.p : 0), 0);
    const mun = lista.filter(([, x]) => enSequia(x.c)).length;
    // Por personas (igual que la cifra), no por municipios
    const porCat = CATEGORIAS.map((_, i) => lista.reduce((s, [, x]) => s + (x.c === i ? x.p : 0), 0));
    const pct = pob ? Math.round((pobSeq / pob) * 100) : 0;
    return {
      sobre: `Sequía · ${e.e}`,
      titulo: e.e,
      cifra: `${pct}%`,
      cifraTexto: "de su gente vive en un municipio con sequía",
      segmentos: CATEGORIAS.map((c, i) => ({ pct: pob ? (porCat[i] / pob) * 100 : 0, color: c.color, label: c.corto })),
      frase: `${mun} de ${lista.length} municipios en sequía al ${fechaCorta(sequia.f)}.`,
      destino: `/sequia#e=${e.slug}`,
      boton: "Ver la sequía",
      descripcion: `${pct}% de la gente de ${e.e} vive en un municipio con sequía: ${mun} de ${lista.length} municipios al ${fechaCorta(sequia.f)}.`,
    };
  }
  if (tipo === "sequia-municipio") {
    const x = sequia.m[clave];
    const m = munNombres.get(clave);
    if (!x || !m) return null;
    const e = estados.find((y) => y.cve === clave.slice(0, 2));
    const cat = CATEGORIAS[x.c];
    const en = enSequia(x.c);
    return {
      sobre: `Sequía · ${e?.e ?? ""}`,
      titulo: m,
      etiqueta: { texto: cat.label, color: cat.color },
      cifra: en ? duracion(x.r) : `${x.t}%`,
      cifraTexto: en ? "seguidos en sequía" : "del tiempo en sequía desde 2003",
      // Franja de los últimos 2 años: una quincena por segmento, sin leyenda (son muy angostos)
      segmentos: x.h.split("").map((c) => ({ pct: 100 / x.h.length, color: CATEGORIAS[Number(c)].color, label: "" })),
      frase: !en && Math.max(...x.h.split("").map(Number)) >= 2
        ? `Hoy sin sequía, pero en estos 2 años llegó a ${CATEGORIAS[Math.max(...x.h.split("").map(Number))].label.toLowerCase()}.`
        : "Los últimos 2 años, quincena por quincena.",
      destino: `/sequia#m=${clave}`,
      boton: "Ver la sequía",
      descripcion: en
        ? `${m} (${e?.e ?? ""}) lleva ${duracion(x.r)} seguidos en sequía (${cat.label.toLowerCase()}), al ${fechaCorta(sequia.f)}.`
        : `${m} (${e?.e ?? ""}) ha pasado ${x.t}% del tiempo en sequía desde 2003.`,
    };
  }
  if (tipo === "dias") {
    const s = diasAgua.sistemas.find((x) => x.id === clave);
    if (!s) return null;
    const a = s.actual;
    const p = s.peor;
    const cuando = (f: string) => `${mesLargo(f)} de\u00a0${f.slice(0, 4)}`;
    const meses = Math.round((Date.parse(p.f) - Date.parse(p.antes.f)) / (30.44 * 864e5));
    return {
      sobre: `Días de agua · ${s.ciudad}`,
      titulo: s.nombre,
      cifra: fmt(p.dias, 0),
      cifraTexto: `días de agua le quedaban en ${cuando(p.f)}`,
      barra: { pct: Math.min(p.pct, 100), color: nivel(p.pct).color },
      frase: `${meses} meses antes tenía ${fmt(p.antes.dias, 0)}. Una temporada seca basta.`,
      destino: "/#dias",
      boton: "Ver los días de agua",
      descripcion: `En ${cuando(p.f)}, al ${s.nombre} le quedaban ${p.dias} días de agua; ${meses} meses antes tenía ${p.antes.dias}. Hoy: ${a.dias} días (${fmt(a.pct, 0)}% al ${fechaCorta(a.f)}).`,
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
  { tipo: "dias", clave: "cutzamala" },
  { tipo: "dias", clave: "monterrey" },
  { tipo: "usos-estado", clave: "jalisco" },
  { tipo: "sequia-estado", clave: "chihuahua" },
];
