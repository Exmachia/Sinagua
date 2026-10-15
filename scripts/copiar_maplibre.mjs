// MapLibre 6 corre su "worker" desde un archivo aparte que el empaquetador no copia solo.
// Se copia a public/maplibre con la versión en el nombre (así el navegador no usa uno viejo).
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const dist = join(raiz, "node_modules/maplibre-gl/dist");
const { version } = JSON.parse(readFileSync(join(raiz, "node_modules/maplibre-gl/package.json"), "utf8"));
const destino = join(raiz, "public/maplibre");
mkdirSync(destino, { recursive: true });
for (const f of readdirSync(destino)) rmSync(join(destino, f));
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), join(destino, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre worker ${version} → public/maplibre`);
