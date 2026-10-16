"use client";

import * as maplibregl from "maplibre-gl";
import { type ExpressionSpecification, type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { fmt, type Bbox } from "@/lib/acuiferos";
import { agregarEtiquetasEstados, configurarMapLibre, BASE, filtrarEtiquetasEstados, FONDO, prepararBase, TINTA } from "@/lib/mapa";
import { NIVELES, nivel, SIN_DATO, type EstadoPresas, type Presa } from "@/lib/presas";
import type { Margen } from "./AquiferMap";

export type VistaPresas = { e: string | null; p: string | null };

type Props = {
  vista: VistaPresas;
  focus: Bbox | null;
  margen: Margen;
  presas: Presa[];
  estados: Map<string, EstadoPresas>; // por clave INEGI
  nombres: Map<string, string>; // clave INEGI → nombre (incluye estados sin presas)
  onNavigate: (v: VistaPresas) => void;
};

const MEXICO: LngLatBoundsLike = [
  [-117.2, 14.4],
  [-86.6, 32.8],
];
const SIN_PRESAS = "#ece8df";

const escalaNivel = (campo: ExpressionSpecification): ExpressionSpecification => [
  "step", campo, NIVELES[0].color, ...NIVELES.slice(1).flatMap((n) => [n.desde, n.color] as [number, string]),
];
// Área de la burbuja proporcional a la capacidad (radio ∝ √capacidad).
const radio = (escala: number): ExpressionSpecification => [
  "interpolate", ["linear"], ["sqrt", ["get", "cap"]], 1, 4 * escala, 20, 8 * escala, 60, 14 * escala, 115, 22 * escala,
];
const hover: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

type Tip = { x: number; y: number; titulo: string; linea: string; color?: string };

export default function PresasMap({ vista, focus, margen, presas, estados, nombres, onNavigate }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const navegar = useEffectEvent((v: VistaPresas) => onNavigate(v));
  const vistaActual = useEffectEvent(() => vista);
  const describir = useEffectEvent((capa: string, id: string): Omit<Tip, "x" | "y"> | null => {
    if (capa === "estados-fill") {
      const e = estados.get(id);
      if (!e) return { titulo: nombres.get(id) ?? "", linea: "Sin presas principales en el monitoreo" };
      return { titulo: e.e, linea: `${e.presas === 1 ? "Su presa" : `Sus ${e.presas} presas`}, al ${fmt(e.pct, 0)}% de su capacidad`, color: nivel(e.pct).color };
    }
    const p = presas.find((x) => x.c === id);
    if (!p) return null;
    if (!p.reciente) return { titulo: p.n, linea: "Sin dato reciente", color: SIN_DATO };
    return { titulo: p.n, linea: `${fmt(p.pct, 0)}% llena · le caben ${fmt(p.cap, 0)} millones de m³`, color: nivel(p.pct).color };
  });

  useEffect(() => {
    if (!container.current) return;
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    configurarMapLibre(maplibregl);
    const map = new maplibregl.Map({
      container: container.current,
      style: BASE,
      bounds: MEXICO,
      fitBoundsOptions: { padding: 24 },
      maxBounds: [[-130, 6], [-74, 38]],
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true, customAttribution: "Datos: CONAGUA (SINA, SIH) · INEGI" },
      locale: { "NavigationControl.ZoomIn": "Acercar", "NavigationControl.ZoomOut": "Alejar" },
    });
    map.touchZoomRotate.disableRotation();
    if (!tactil) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const antesDe = prepararBase(map);

      map.addSource("estados", { type: "geojson", data: "/data/estados.geojson", promoteId: "CVE_ENT" });
      map.addSource("presas", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "c" });

      map.addLayer({ id: "estados-fill", type: "fill", source: "estados", paint: { "fill-color": SIN_PRESAS, "fill-opacity": 0.85 } }, antesDe);
      map.addLayer({ id: "estados-line", type: "line", source: "estados",
        paint: { "line-color": FONDO, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 8, 2] } }, antesDe);
      map.addLayer({ id: "estados-hover", type: "line", source: "estados",
        paint: { "line-color": TINTA, "line-width": 1.5, "line-opacity": ["case", hover, 1, 0] } }, antesDe);
      map.addLayer({ id: "estado-sel", type: "line", source: "estados", filter: ["==", ["get", "CVE_ENT"], ""],
        paint: { "line-color": TINTA, "line-width": 2 } }, antesDe);

      agregarEtiquetasEstados(map);

      // Presas: solo las del estado elegido; encima de los nombres de la base.
      // Halo oscuro fino por fuera del borde blanco: las burbujas claras (amarillo) no se pierden en la base.
      map.addLayer({ id: "presas-halo", type: "circle", source: "presas", filter: ["==", ["get", "ent"], ""],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, radio(0.9), 9, radio(1.5)],
          "circle-stroke-color": "rgba(25,23,20,0.45)",
          "circle-stroke-width": ["case", hover, 4.7, 3.2],
        } });
      map.addLayer({ id: "presas", type: "circle", source: "presas", filter: ["==", ["get", "ent"], ""],
        layout: { "circle-sort-key": ["-", 0, ["get", "cap"]] },
        paint: {
          "circle-color": ["case", ["get", "rec"], escalaNivel(["get", "pct"]), SIN_DATO],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, radio(0.9), 9, radio(1.5)],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", hover, 3.5, 2],
        } });
      map.addLayer({ id: "presas-label", type: "symbol", source: "presas", filter: ["==", ["get", "ent"], ""],
        layout: {
          "text-field": ["get", "n"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": ["interpolate", ["linear"], ["sqrt", ["get", "cap"]], 1, 0.8, 115, 2.2],
          "symbol-sort-key": ["-", 0, ["get", "cap"]],
          "text-optional": true,
        },
        paint: { "text-color": TINTA, "text-halo-color": "#ffffff", "text-halo-width": 1.6 } });
      map.addLayer({ id: "presa-sel", type: "circle", source: "presas", filter: ["==", ["get", "c"], ""],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["+", radio(0.9), 4], 9, ["+", radio(1.5), 4]],
          "circle-stroke-color": TINTA,
          "circle-stroke-width": 3,
        } });
      setReady(true);
    });

    // Interacción. Prioridad: presa > estado. Clic fuera de México: vista nacional.
    const fuente: Record<string, string> = { presas: "presas", "estados-fill": "estados" };
    const hovered: Record<string, string | undefined> = {};
    const limpiar = (capa: string) => {
      const id = hovered[capa];
      if (id !== undefined) map.setFeatureState({ source: fuente[capa], id }, { hover: false });
      hovered[capa] = undefined;
    };
    const tocar = (pt: maplibregl.PointLike) => {
      if (!map.getLayer("presas")) return null;
      const f = map.queryRenderedFeatures(pt, { layers: ["presas", "estados-fill"] })[0];
      return f && f.id !== undefined ? { capa: f.layer.id, id: String(f.id) } : null;
    };
    // En pantallas táctiles no hay "pasar el cursor": el toque abre la ficha y la etiqueta se quedaría pegada.
    map.on("mousemove", (e) => {
      if (tactil) return;
      const hit = tocar(e.point);
      const v = vistaActual();
      const valido = hit && !(hit.capa === "estados-fill" && hit.id === v.e) ? hit : null;
      for (const c of Object.keys(fuente)) if (!valido || valido.capa !== c || hovered[c] !== valido.id) limpiar(c);
      if (!valido) {
        map.getCanvas().style.cursor = "";
        setTip(null);
        return;
      }
      hovered[valido.capa] = valido.id;
      map.setFeatureState({ source: fuente[valido.capa], id: valido.id }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      const d = describir(valido.capa, valido.id);
      setTip(d ? { x: e.point.x, y: e.point.y, ...d } : null);
    });
    map.on("mouseout", () => {
      Object.keys(fuente).forEach(limpiar);
      setTip(null);
    });
    map.on("click", (e) => {
      const hit = tocar(e.point);
      const v = vistaActual();
      if (!hit) {
        if (v.e) navegar({ e: null, p: null });
        return;
      }
      if (hit.capa === "presas") navegar({ e: v.e, p: hit.id });
      else if (hit.id !== v.e) navegar({ e: hit.id, p: null });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      // Si el mapa se recrea (recarga en caliente), sus capas no existen hasta el próximo "load".
      setReady(false);
    };
  }, []);

  // Datos de las burbujas.
  useEffect(() => {
    const src = mapRef.current?.getSource("presas") as GeoJSONSource | undefined;
    if (!ready || !src) return;
    src.setData({
      type: "FeatureCollection",
      features: presas.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { c: p.c, n: p.n, cap: p.cap, pct: p.pct, ent: p.ent, rec: p.reciente },
      })),
    });
  }, [presas, ready]);

  // Estilo según la vista: coropleta nacional o estado abierto con sus presas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const coropleta = [
      "match", ["get", "CVE_ENT"],
      ...[...estados.values()].flatMap((e) => [e.cve, nivel(e.pct).color]),
      SIN_PRESAS,
    ] as unknown as ExpressionSpecification;
    map.setPaintProperty("estados-fill", "fill-color", vista.e
      ? ["case", ["==", ["get", "CVE_ENT"], vista.e], "rgba(0,0,0,0)", "#efece5"]
      : coropleta);
    map.setFilter("estado-sel", ["==", ["get", "CVE_ENT"], vista.e ?? ""]);
    map.setFilter("presas", ["==", ["get", "ent"], vista.e ?? ""]);
    map.setFilter("presas-halo", ["==", ["get", "ent"], vista.e ?? ""]);
    map.setFilter("presas-label", ["==", ["get", "ent"], vista.e ?? ""]);
    map.setFilter("presa-sel", ["==", ["get", "c"], vista.p ?? ""]);
    filtrarEtiquetasEstados(map, vista.e);
  }, [vista, ready, estados]);

  // Encuadre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const padding = { top: margen.top + 24, right: margen.right + 24, bottom: margen.bottom + 24, left: margen.left + 24 };
    if (focus) map.fitBounds([[focus[0], focus[1]], [focus[2], focus[3]]], { padding, maxZoom: 10, duration: reduce ? 0 : 1000 });
    else map.fitBounds(MEXICO, { padding, duration: reduce ? 0 : 900 });
    // Solo se re-encuadra al cambiar el foco, no cuando el módulo cambia de tamaño.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="region"
        aria-label="Mapa de México: estados coloreados por qué tan llenas están sus presas. Al elegir un estado se muestran sus presas como burbujas. El buscador permite hacer lo mismo con el teclado." />
      {!ready && <div className="absolute inset-0 grid place-items-center bg-bg text-sm text-ink-3">Cargando mapa…</div>}
      {tip && (
        <div className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg bg-surface px-3 py-2 shadow-[0_8px_24px_rgba(25,23,20,0.18)] ring-1 ring-black/5"
          style={{ left: tip.x, top: tip.y, transform: `translate(${tip.x > 280 ? "calc(-100% - 16px)" : "16px"}, -50%)` }}>
          <p className="font-serif text-lg leading-tight font-semibold">{tip.titulo}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            {tip.color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: tip.color }} />}
            {tip.linea}
          </p>
        </div>
      )}
    </div>
  );
}
