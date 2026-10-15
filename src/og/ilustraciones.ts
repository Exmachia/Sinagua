/**
 * Ilustraciones propias para los casos destacados (sin fotos de terceros). SVG en texto: sirve igual en la página
 * (<img>) y en las imágenes generadas con Satori (data URI).
 */

/** Un vaso de agua turbia, con sedimento flotando. */
function aguaTurbia() {
  const particulas = [
    [118, 250, 4], [160, 300, 3], [205, 262, 5], [250, 318, 3.5], [140, 360, 4.5], [228, 380, 3], [182, 410, 4],
    [265, 270, 2.5], [126, 420, 3], [198, 335, 2.5], [244, 430, 4], [150, 455, 3.5], [214, 470, 2.5], [172, 228, 2.5],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a1f12" opacity=".55"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 560" width="380" height="560">
  <defs>
    <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a7246"/>
      <stop offset=".55" stop-color="#6a5432"/>
      <stop offset="1" stop-color="#3f3220"/>
    </linearGradient>
    <clipPath id="vaso"><path d="M70 60 L310 60 L282 520 Q280 540 260 540 L120 540 Q100 540 98 520 Z"/></clipPath>
  </defs>
  <g clip-path="url(#vaso)">
    <rect x="0" y="0" width="380" height="560" fill="#f2ebe1" opacity=".06"/>
    <rect x="0" y="190" width="380" height="370" fill="url(#agua)"/>
    <path d="M60 190 Q120 176 190 190 T330 190 L330 206 L60 206 Z" fill="#a08a5c" opacity=".7"/>
    ${particulas}
    <rect x="0" y="470" width="380" height="90" fill="#2a1f12" opacity=".35"/>
  </g>
  <path d="M70 60 L310 60 L282 520 Q280 540 260 540 L120 540 Q100 540 98 520 Z" fill="none" stroke="#f2ebe1" stroke-width="6" stroke-linejoin="round"/>
  <path d="M92 90 L110 500" stroke="#f2ebe1" stroke-width="5" stroke-linecap="round" opacity=".25"/>
</svg>`;
}

const ILUSTRACIONES: Record<string, () => string> = { "agua-turbia": aguaTurbia };

export function ilustracion(nombre: string | undefined): string | null {
  const f = nombre ? ILUSTRACIONES[nombre] : undefined;
  return f ? `data:image/svg+xml;base64,${Buffer.from(f()).toString("base64")}` : null;
}
