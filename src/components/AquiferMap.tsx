"use client";

import * as maplibregl from "maplibre-gl";
import {
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  ESTATUS,
  ESTATUS_HEX,
  fmt,
  RAMPA,
  type Acuifero,
  type Bbox,
  type Estado,
  type Municipio,
} from "@/lib/acuiferos";
import { SEMAFORO, type Semaforo } from "@/lib/usos";
import { agregarEtiquetasEstados, configurarMapLibre, BASE, filtrarEtiquetasEstados, FONDO, prepararBase, TINTA } from "@/lib/mapa";

export type Vista = { e: string | null; m: string | null; a: string | null };

export type Margen = { top: number; right: number; bottom: number; left: number };

type Props = {
  vista: Vista;
  focus: Bbox | null;
  /** Espacio que tapan los módulos flotantes; los encuadres lo respetan. */
  margen: Margen;
  estados: Map<string, Estado>;
  municipios: Map<string, Municipio>;
  acuiferos: Map<string, Acuifero>;
  onNavigate: (v: Vista) => void;
  /** Mostrar los sitios de medición de calidad del agua (gotas) del estado abierto. */
  calidad: boolean;
};

const MEXICO: LngLatBoundsLike = [
  [-117.2, 14.4],
  [-86.6, 32.8],
];

const rampa: ExpressionSpecification = [
  "step",
  ["get", "pct"],
  RAMPA[0].color,
  ...RAMPA.slice(1).flatMap((r) => [r.desde, r.color] as [number, string]),
];
const colorEstatus: ExpressionSpecification = [
  "match",
  ["get", "s"],
  "disponible", ESTATUS_HEX.disponible,
  "limite", ESTATUS_HEX.limite,
  "deficit", ESTATUS_HEX.deficit,
  "critico", ESTATUS_HEX.critico,
  "#999",
];
const hover: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
const vacio: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

type Tip = { x: number; y: number; titulo: string; linea: string; color?: string };

/** Gota de semáforo dibujada en un canvas (la forma la distingue de las burbujas de acuíferos). */
function gota(color: string, pr: number) {
  const w = 20 * pr, h = 26 * pr;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.scale(pr, pr);
  const forma = () => {
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.bezierCurveTo(10, 2, 3, 11, 3, 16.5);
    ctx.arc(10, 16.5, 7, Math.PI, 0, true);
    ctx.bezierCurveTo(17, 11, 10, 2, 10, 2);
    ctx.closePath();
  };
  forma();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(25,23,20,0.35)";
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  return { width: w, height: h, data: new Uint8Array(ctx.getImageData(0, 0, w, h).data.buffer) };
}
const NOMBRE_SEMAFORO: Record<Semaforo, string> = { r: "Contaminada", a: "Con problemas", v: "Cumple" };
const FUENTE: Record<string, string> = { "estados-fill": "estados", "acuiferos-fill": "acuiferos", burbujas: "burbujas" };

export default function AquiferMap({ vista, focus, margen, estados, municipios, acuiferos, onNavigate, calidad }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const calidadCargada = useRef(false); // el GeoJSON de calidad se pide una sola vez
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const navegar = useEffectEvent((v: Vista) => onNavigate(v));
  const vistaActual = useEffectEvent(() => vista);
  const describir = useEffectEvent((capa: string, id: string): Omit<Tip, "x" | "y"> | null => {
    if (capa === "estados-fill") {
      const e = estados.get(id);
      return e ? { titulo: e.e, linea: `${fmt(e.pct, 0)}% del territorio sobre acuíferos sobreexplotados` } : null;
    }
    const a = acuiferos.get(id);
    return a ? { titulo: a.n, linea: ESTATUS[a.s].label, color: ESTATUS[a.s].color } : null;
  });

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!container.current) return;
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    configurarMapLibre(maplibregl);
    const map = new maplibregl.Map({
      container: container.current,
      style: BASE,
      bounds: MEXICO,
      fitBoundsOptions: { padding: 24 },
      maxBounds: [
        [-130, 6],
        [-74, 38],
      ],
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true, customAttribution: "Datos: CONAGUA · DOF · INEGI" },
      locale: {
        "NavigationControl.ZoomIn": "Acercar",
        "NavigationControl.ZoomOut": "Alejar",
      },
    });
    map.touchZoomRotate.disableRotation();
    // En pantallas táctiles se acerca pellizcando; los botones estorbarían al buscador flotante.
    if (!tactil) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const antesDe = prepararBase(map);

      map.addSource("estados", { type: "geojson", data: "/data/estados.geojson", promoteId: "CVE_ENT" });
      map.addSource("acuiferos", { type: "geojson", data: "/data/acuiferos.geojson", promoteId: "clave" });
      map.addSource("municipios", { type: "geojson", data: vacio, promoteId: "CVEGEO" });
      map.addSource("burbujas", { type: "geojson", data: "/data/burbujas.geojson", promoteId: "clave" });

      map.addLayer({ id: "estados-fill", type: "fill", source: "estados",
        paint: { "fill-color": rampa, "fill-opacity": 0.85 } }, antesDe);
      map.addLayer({ id: "acuiferos-fill", type: "fill", source: "acuiferos", filter: ["in", ["get", "clave"], ["literal", []]],
        paint: { "fill-color": colorEstatus, "fill-opacity": 0.45 } }, antesDe);
      map.addLayer({ id: "municipios-fill", type: "fill", source: "municipios",
        paint: { "fill-color": TINTA, "fill-opacity": ["case", hover, 0.12, 0] } }, antesDe);
      map.addLayer({ id: "municipios-line", type: "line", source: "municipios",
        paint: { "line-color": TINTA, "line-opacity": 0.4, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 10, 1] } }, antesDe);
      map.addLayer({ id: "estados-line", type: "line", source: "estados",
        paint: { "line-color": FONDO, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 8, 2] } }, antesDe);
      map.addLayer({ id: "estados-hover", type: "line", source: "estados",
        paint: { "line-color": TINTA, "line-width": 1.5, "line-opacity": ["case", hover, 1, 0] } }, antesDe);
      map.addLayer({ id: "estado-sel", type: "line", source: "estados", filter: ["==", ["get", "CVE_ENT"], ""],
        paint: { "line-color": TINTA, "line-width": 2 } }, antesDe);
      map.addLayer({ id: "acuifero-sel", type: "line", source: "acuiferos", filter: ["==", ["get", "clave"], ""],
        layout: { "line-join": "round" },
        paint: { "line-color": TINTA, "line-width": 2.5, "line-dasharray": [2, 1.5] } }, antesDe);
      map.addLayer({ id: "municipio-sel", type: "line", source: "municipios", filter: ["==", ["get", "CVEGEO"], ""],
        paint: { "line-color": TINTA, "line-width": 3 } }, antesDe);

      agregarEtiquetasEstados(map);

      // Calidad del agua: una gota por sitio de medición. Se carga al abrir el primer estado.
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      for (const k of ["r", "a", "v"] as Semaforo[]) map.addImage(`gota-${k}`, gota(SEMAFORO[k].color, pr), { pixelRatio: pr });
      map.addSource("calidad", { type: "geojson", data: vacio });
      map.addLayer({ id: "calidad", type: "symbol", source: "calidad", filter: ["==", ["get", "cve"], ""],
        layout: {
          "icon-image": ["concat", "gota-", ["get", "s"]],
          "icon-anchor": "bottom",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.75, 10, 1.05],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Las rojas, encima
          "symbol-sort-key": ["match", ["get", "s"], "r", 3, "a", 2, 1],
        } });

      // Burbujas: encima de todo, incluso de los nombres de la base.
      // Halo oscuro fino por fuera del borde blanco: las burbujas claras (amarillo) no se pierden en la base.
      map.addLayer({ id: "burbujas-halo", type: "circle", source: "burbujas", filter: ["in", ["get", "clave"], ["literal", []]],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["case", hover, 9, 6.5], 9, ["case", hover, 13, 10]],
          "circle-stroke-color": "rgba(25,23,20,0.45)",
          "circle-stroke-width": 3.2,
        } });
      map.addLayer({ id: "burbujas", type: "circle", source: "burbujas", filter: ["in", ["get", "clave"], ["literal", []]],
        paint: {
          "circle-color": colorEstatus,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["case", hover, 9, 6.5], 9, ["case", hover, 13, 10]],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        } });
      map.addLayer({ id: "burbujas-label", type: "symbol", source: "burbujas", filter: ["in", ["get", "clave"], ["literal", []]],
        layout: {
          "text-field": ["get", "n"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-max-width": 9,
          "text-optional": true,
        },
        paint: { "text-color": TINTA, "text-halo-color": "#ffffff", "text-halo-width": 1.6 } });
      map.addLayer({ id: "burbuja-sel", type: "circle", source: "burbujas", filter: ["==", ["get", "clave"], ""],
        paint: { "circle-color": colorEstatus, "circle-radius": 13, "circle-stroke-color": TINTA, "circle-stroke-width": 3 } });

      setReady(true);
    });

    // Interacción: hover con tooltip y clic que navega. Prioridad: burbuja > acuífero > estado (sin nivel de municipio).
    const hovered: Record<string, string | undefined> = {};
    const limpiar = (capa: string) => {
      const id = hovered[capa];
      if (id !== undefined) map.setFeatureState({ source: FUENTE[capa], id }, { hover: false });
      hovered[capa] = undefined;
    };
    const tocar = (e: MapMouseEvent) => {
      if (!map.getLayer("burbujas")) return null;
      const f = map.queryRenderedFeatures(e.point, { layers: ["burbujas", "calidad", "acuiferos-fill", "estados-fill"] })[0];
      if (f?.layer.id === "calidad") return { capa: "calidad", id: String(f.properties.c), props: f.properties };
      return f && f.id !== undefined ? { capa: f.layer.id, id: String(f.id), props: f.properties } : null;
    };
    const tipGota = (p: Record<string, unknown>) => {
      const s = p.s as Semaforo;
      return {
        titulo: String(p.cuerpo || p.n),
        linea: `${p.t === "pozo" ? "Pozo" : "Agua superficial"} · ${NOMBRE_SEMAFORO[s]}${p.q ? `: ${p.q}` : ""} · ${p.y}`,
        color: SEMAFORO[s].color,
      };
    };

    // En pantallas táctiles no hay "pasar el cursor": el toque abre la ficha y la etiqueta se quedaría pegada.
    map.on("mousemove", (e) => {
      if (tactil) return;
      const hit = tocar(e);
      const v = vistaActual();
      // En la vista estatal no se resalta ningún estado: tocar fuera del elegido regresa a México.
      const valido = hit && !(hit.capa === "estados-fill" && v.e) ? hit : null;
      for (const c of Object.keys(FUENTE)) if (!valido || valido.capa !== c || hovered[c] !== valido.id) limpiar(c);
      if (!valido) {
        map.getCanvas().style.cursor = "";
        setTip(null);
        return;
      }
      map.getCanvas().style.cursor = "pointer";
      if (valido.capa === "calidad") {
        setTip({ x: e.point.x, y: e.point.y, ...tipGota(valido.props) });
        return;
      }
      hovered[valido.capa] = valido.id;
      map.setFeatureState({ source: FUENTE[valido.capa], id: valido.id }, { hover: true });
      const d = describir(valido.capa, valido.id);
      setTip(d ? { x: e.point.x, y: e.point.y, ...d } : null);
    });
    let quitarTip = 0;
    map.on("movestart", () => setTip(null));
    map.on("mouseout", () => {
      Object.keys(FUENTE).forEach(limpiar);
      setTip(null);
    });
    map.on("click", (e) => {
      const hit = tocar(e);
      const v = vistaActual();
      // Con un acuífero abierto, tocar fuera de él regresa al estado completo (no salta a otro acuífero).
      if (v.a && hit?.capa !== "calidad") {
        const mismo = (hit?.capa === "burbujas" || hit?.capa === "acuiferos-fill") && hit.id === v.a;
        if (!mismo) navegar({ e: v.e, m: null, a: null });
        return;
      }
      // Clic fuera de México (mar, otro país): volver a la vista nacional.
      if (!hit) {
        if (v.e) navegar({ e: null, m: null, a: null });
        return;
      }
      // Gota: en pantallas táctiles no hay "hover", así que el toque muestra su etiqueta.
      if (hit.capa === "calidad") {
        setTip({ x: e.point.x, y: e.point.y, ...tipGota(hit.props) });
        window.clearTimeout(quitarTip);
        quitarTip = window.setTimeout(() => setTip(null), 4000);
      }
      else if (hit.capa === "burbujas") navegar({ ...v, a: hit.id });
      else if (hit.capa === "acuiferos-fill") navegar({ e: v.e, m: null, a: hit.id });
      // Con un estado abierto, tocar otro estado regresa a la vista nacional (no salta al otro).
      else if (hit.id !== v.e) navegar(v.e ? { e: null, m: null, a: null } : { e: hit.id, m: null, a: null });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      // Si el mapa se recrea (recarga en caliente), sus capas no existen hasta el próximo "load".
      setReady(false);
      calidadCargada.current = false;
    };
  }, []);

  // Estilo según la vista.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const est = vista.e ? estados.get(vista.e) : null;
    const claves = est?.a ?? (vista.a ? [vista.a] : []);
    // Con un acuífero abierto, los demás del estado se atenúan para que se note cuál es.
    const enMun = vista.a ? [vista.a] : null;

    // Nacional: coropleta por estado. Estatal: el estado elegido se abre y los demás se apagan.
    map.setPaintProperty("estados-fill", "fill-color", est
      ? ["case", ["==", ["get", "CVE_ENT"], est.cve], "rgba(0,0,0,0)", "#efece5"]
      : rampa);
    map.setPaintProperty("estados-fill", "fill-opacity", est ? 0.88 : 0.85);
    map.setFilter("estado-sel", ["==", ["get", "CVE_ENT"], est?.cve ?? ""]);
    map.setFilter("acuiferos-fill", ["in", ["get", "clave"], ["literal", claves]]);
    map.setPaintProperty("acuiferos-fill", "fill-opacity", enMun
      ? ["case", ["in", ["get", "clave"], ["literal", enMun]], 0.55, ["case", hover, 0.3, 0.12]]
      : ["case", hover, 0.62, 0.42]);
    map.setFilter("burbujas", ["in", ["get", "clave"], ["literal", claves]]);
    map.setFilter("burbujas-halo", ["in", ["get", "clave"], ["literal", claves]]);
    map.setFilter("burbujas-label", ["in", ["get", "clave"], ["literal", enMun ?? claves]]);
    const atenuar: ExpressionSpecification | number = enMun
      ? ["case", ["in", ["get", "clave"], ["literal", enMun]], 1, 0.3]
      : 1;
    map.setPaintProperty("burbujas", "circle-opacity", atenuar);
    map.setPaintProperty("burbujas", "circle-stroke-opacity", atenuar);
    map.setPaintProperty("burbujas-halo", "circle-stroke-opacity", atenuar);
    map.setFilter("municipio-sel", ["==", ["get", "CVEGEO"], vista.m ?? ""]);
    filtrarEtiquetasEstados(map, vista.e);
    map.setFilter("acuifero-sel", ["==", ["get", "clave"], vista.a ?? ""]);
    map.setFilter("burbuja-sel", ["==", ["get", "clave"], vista.a ?? ""]);
  }, [vista, ready, estados, municipios]);

  // Gotas de calidad del agua del estado abierto.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("calidad")) return;
    const ver = calidad && !!vista.e;
    if (ver && !calidadCargada.current) {
      (map.getSource("calidad") as GeoJSONSource).setData("/data/calidad.geojson");
      calidadCargada.current = true;
    }
    map.setLayoutProperty("calidad", "visibility", ver ? "visible" : "none");
    map.setFilter("calidad", ["==", ["get", "cve"], vista.e ?? ""]);
  }, [calidad, vista.e, ready]);

  // Volar al foco.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const padding = { top: margen.top + 24, right: margen.right + 24, bottom: margen.bottom + 24, left: margen.left + 24 };
    if (focus) {
      map.fitBounds([[focus[0], focus[1]], [focus[2], focus[3]]], { padding, maxZoom: 10, duration: reduce ? 0 : 1000 });
    } else {
      map.fitBounds(MEXICO, { padding, duration: reduce ? 0 : 900 });
    }
    // Solo se re-encuadra al cambiar el foco, no cuando el módulo cambia de tamaño.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ready]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className="h-full w-full"
        role="region"
        aria-label="Mapa de México por estado. Al elegir un estado se muestran sus acuíferos, cada uno con su burbuja. El buscador permite hacer lo mismo con el teclado."
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-bg text-sm text-ink-3" aria-live="polite">
          Cargando mapa…
        </div>
      )}
      {tip && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-64 border border-ink bg-surface px-3 py-2 shadow-[3px_3px_0_0_rgba(25,23,20,0.15)]"
          style={{
            left: tip.x,
            top: tip.y,
            transform: `translate(${tip.x > 280 ? "calc(-100% - 14px)" : "14px"}, -50%)`,
          }}
        >
          <p className="font-serif text-lg leading-tight font-semibold">{tip.titulo}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-snug text-ink-2">
            {tip.color && <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: tip.color }} />}
            {tip.linea}
          </p>
        </div>
      )}
    </div>
  );
}
