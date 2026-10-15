import type * as maplibregl from "maplibre-gl";

/** Base clara y gratuita (OpenFreeMap / OpenStreetMap). */
export const BASE = "https://tiles.openfreemap.org/styles/positron";
export const TINTA = "#191714";
export const FONDO = "#fbfaf7";

/**
 * Ajusta la base: nombres en español y sin los límites/etiquetas de estados propios de la base
 * (los dibujamos nosotros). Devuelve la primera capa de texto, para insertar los rellenos debajo.
 */
export function prepararBase(map: maplibregl.Map): string | undefined {
  for (const l of map.getStyle().layers) {
    if (l.type === "symbol" && /^(label_|water_name|waterway_line_label)/.test(l.id)) {
      map.setLayoutProperty(l.id, "text-field", ["coalesce", ["get", "name:es"], ["get", "name"]]);
    }
  }
  for (const id of ["boundary_3", "label_state", "label_country_1", "label_country_2", "label_country_3"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }
  return map.getStyle().layers.find((l) => l.type === "symbol")?.id;
}

/** Pastilla blanca redondeada, estirable, para poner detrás del nombre de cada estado. */
function pastilla(): { width: number; height: number; data: Uint8ClampedArray } {
  const s = 2; // densidad de píxeles
  const w = 32 * s;
  const h = 24 * s;
  const r = 12 * s;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.beginPath();
  ctx.roundRect(1 * s, 1 * s, w - 2 * s, h - 2 * s, r - s);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(25,23,20,0.25)";
  ctx.shadowBlur = 1.5 * s;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1 * s;
  ctx.strokeStyle = "rgba(25,23,20,0.18)";
  ctx.stroke();
  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data };
}

/**
 * Nombres de los estados en pastillas blancas con texto negro (más legibles que el texto sobre color).
 * Se ocultan los del estado elegido con `filtrarEtiquetasEstados`.
 */
export function agregarEtiquetasEstados(map: maplibregl.Map) {
  const s = 2;
  map.addImage("pastilla", pastilla(), {
    pixelRatio: s,
    stretchX: [[12 * s, 20 * s]],
    stretchY: [[12 * s, 12 * s + 1]],
    content: [8 * s, 4 * s, 24 * s, 20 * s],
  });
  map.addSource("estados-puntos", { type: "geojson", data: "/data/estados_puntos.geojson" });
  map.addLayer({
    id: "estados-etiqueta",
    type: "symbol",
    source: "estados-puntos",
    layout: {
      "text-field": ["get", "nombre"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 7, 13],
      "text-max-width": 8,
      "icon-image": "pastilla",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [2, 4, 2, 4],
      "symbol-sort-key": ["case", ["==", ["get", "CVE_ENT"], "09"], 0, 1], // CDMX primero
    },
    paint: { "text-color": TINTA },
  });
}

/** Oculta la etiqueta del estado abierto (sus presas o municipios ya ocupan ese espacio). */
export function filtrarEtiquetasEstados(map: maplibregl.Map, estadoAbierto: string | null) {
  if (!map.getLayer("estados-etiqueta")) return;
  map.setFilter("estados-etiqueta", ["!=", ["get", "CVE_ENT"], estadoAbierto ?? ""]);
  map.setPaintProperty("estados-etiqueta", "icon-opacity", estadoAbierto ? 0.85 : 1);
  map.setPaintProperty("estados-etiqueta", "text-opacity", estadoAbierto ? 0.7 : 1);
}

/** MapLibre 6: dónde está su worker (lo copia scripts/copiar_maplibre.mjs). Se llama antes de crear un mapa. */
export function configurarMapLibre(lib: typeof maplibregl) {
  lib.setWorkerUrl(`/maplibre/maplibre-gl-worker-${lib.getVersion()}.mjs`);
}
