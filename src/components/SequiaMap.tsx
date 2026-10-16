"use client";

import * as maplibregl from "maplibre-gl";
import { type ExpressionSpecification, type LngLatBoundsLike } from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Bbox } from "@/lib/acuiferos";
import { agregarEtiquetasEstados, configurarMapLibre, BASE, filtrarEtiquetasEstados, FONDO, prepararBase, TINTA } from "@/lib/mapa";
import { CATEGORIAS, duracion, enSequia, type DatosSequia } from "@/lib/sequia";
import type { Margen } from "./AquiferMap";

export type VistaSequia = { e: string | null; m: string | null };

type Props = {
  vista: VistaSequia;
  focus: Bbox | null;
  margen: Margen;
  datos: DatosSequia;
  nombres: Map<string, string>; // CVEGEO → nombre del municipio
  onNavigate: (v: VistaSequia) => void;
};

const MEXICO: LngLatBoundsLike = [
  [-117.2, 14.4],
  [-86.6, 32.8],
];
const hover: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
type Tip = { x: number; y: number; titulo: string; linea: string; color: string };

export default function SequiaMap({ vista, focus, margen, datos, nombres, onNavigate }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const navegar = useEffectEvent((v: VistaSequia) => onNavigate(v));
  const vistaActual = useEffectEvent(() => vista);
  const describir = useEffectEvent((id: string): Omit<Tip, "x" | "y"> | null => {
    const s = datos.m[id];
    if (!s) return null;
    const cat = CATEGORIAS[s.c];
    return {
      titulo: nombres.get(id) ?? id,
      linea: enSequia(s.c) ? `${cat.label} · lleva ${duracion(s.r)}` : cat.label,
      color: cat.color,
    };
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
      attributionControl: { compact: true, customAttribution: "Datos: Monitor de Sequía de México (SMN-CONAGUA) · INEGI" },
      locale: { "NavigationControl.ZoomIn": "Acercar", "NavigationControl.ZoomOut": "Alejar" },
    });
    map.touchZoomRotate.disableRotation();
    if (!tactil) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const antesDe = prepararBase(map);
      // Color de cada municipio por su categoría de hoy (una sola expresión; la geometría no cambia).
      const color: ExpressionSpecification = [
        "match", ["get", "CVEGEO"],
        ...Object.entries(datos.m).flatMap(([g, s]) => [g, CATEGORIAS[s.c].color]),
        CATEGORIAS[0].color,
      ] as unknown as ExpressionSpecification;

      map.addSource("municipios", { type: "geojson", data: "/data/municipios_mx.geojson", promoteId: "CVEGEO" });
      map.addSource("estados", { type: "geojson", data: "/data/estados.geojson", promoteId: "CVE_ENT" });
      map.addLayer({ id: "mun-fill", type: "fill", source: "municipios", paint: { "fill-color": color, "fill-opacity": 0.92 } }, antesDe);
      map.addLayer({ id: "mun-line", type: "line", source: "municipios",
        paint: { "line-color": FONDO, "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.15, 7, 0.7], "line-width": 0.5 } }, antesDe);
      // Fuera del estado abierto, todo se apaga.
      map.addLayer({ id: "estados-velo", type: "fill", source: "estados", filter: ["==", ["get", "CVE_ENT"], ""],
        paint: { "fill-color": "#efece5", "fill-opacity": 0.85 } }, antesDe);
      map.addLayer({ id: "estados-line", type: "line", source: "estados",
        paint: { "line-color": FONDO, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 2.2] } }, antesDe);
      map.addLayer({ id: "mun-hover", type: "line", source: "municipios",
        paint: { "line-color": TINTA, "line-width": 1.5, "line-opacity": ["case", hover, 1, 0] } }, antesDe);
      map.addLayer({ id: "estado-sel", type: "line", source: "estados", filter: ["==", ["get", "CVE_ENT"], ""],
        paint: { "line-color": TINTA, "line-width": 2 } }, antesDe);
      map.addLayer({ id: "mun-sel", type: "line", source: "municipios", filter: ["==", ["get", "CVEGEO"], ""],
        paint: { "line-color": TINTA, "line-width": 3 } }, antesDe);
      agregarEtiquetasEstados(map);
      setReady(true);
    });

    let hovered: string | null = null;
    const limpiar = () => {
      if (hovered) map.setFeatureState({ source: "municipios", id: hovered }, { hover: false });
      hovered = null;
    };
    const tocar = (p: maplibregl.PointLike) => {
      if (!map.getLayer("mun-fill")) return null;
      const f = map.queryRenderedFeatures(p, { layers: ["mun-fill"] })[0];
      return f?.id !== undefined ? String(f.id) : null;
    };
    // En pantallas táctiles no hay "pasar el cursor": el toque abre la ficha y la etiqueta se quedaría pegada.
    map.on("mousemove", (e) => {
      if (tactil) return;
      const id = tocar(e.point);
      if (id !== hovered) limpiar();
      if (!id) {
        map.getCanvas().style.cursor = "";
        setTip(null);
        return;
      }
      hovered = id;
      map.setFeatureState({ source: "municipios", id }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      const d = describir(id);
      setTip(d ? { x: e.point.x, y: e.point.y, ...d } : null);
    });
    map.on("mouseout", () => {
      limpiar();
      setTip(null);
    });
    map.on("click", (e) => {
      const id = tocar(e.point);
      if (!id) {
        if (vistaActual().e) navegar({ e: null, m: null });
        return;
      }
      navegar({ e: id.slice(0, 2), m: id });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // El mapa se crea una vez; los colores salen de los datos de ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setFilter("estados-velo", vista.e ? ["!=", ["get", "CVE_ENT"], vista.e] : ["==", ["get", "CVE_ENT"], ""]);
    map.setFilter("estado-sel", ["==", ["get", "CVE_ENT"], vista.e ?? ""]);
    map.setFilter("mun-sel", ["==", ["get", "CVEGEO"], vista.m ?? ""]);
    filtrarEtiquetasEstados(map, vista.e);
  }, [vista, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const padding = { top: margen.top + 24, right: margen.right + 24, bottom: margen.bottom + 24, left: margen.left + 24 };
    if (focus) map.fitBounds([[focus[0], focus[1]], [focus[2], focus[3]]], { padding, maxZoom: 10, duration: reduce ? 0 : 1000 });
    else map.fitBounds(MEXICO, { padding, duration: reduce ? 0 : 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="region"
        aria-label="Mapa de sequía por municipio. El buscador permite elegir estado o municipio con el teclado." />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-bg text-sm text-ink-3" aria-live="polite">Cargando mapa…</div>
      )}
      {tip && (
        <div className="pointer-events-none absolute z-10 w-max max-w-64 border border-ink bg-surface px-3 py-2 shadow-[3px_3px_0_0_rgba(25,23,20,0.15)]"
          style={{ left: tip.x, top: tip.y, transform: `translate(${tip.x > 280 ? "calc(-100% - 14px)" : "14px"}, -50%)` }}>
          <p className="font-serif text-lg leading-tight font-semibold">{tip.titulo}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-snug text-ink-2">
            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: tip.color }} />
            {tip.linea}
          </p>
        </div>
      )}
    </div>
  );
}
