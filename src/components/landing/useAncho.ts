"use client";

import { useEffect, useRef, useState } from "react";

/** Ancho real del contenedor: las gráficas se dibujan a su tamaño para que el texto no se encoja en móvil. */
/** Empieza en 0: la gráfica no se dibuja hasta medir, para no ensanchar la página en móvil. */
export function useAncho<T extends HTMLElement>(inicial = 0) {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}
