// Descarga el monitoreo de las principales presas (CONAGUA, SINA) una fecha por semana.
// La API solo responde dentro de un navegador (protección anti-bots), así que se usa el
// Chrome instalado vía playwright-core. Guarda data/raw/presas/AAAA-MM-DD.json y retoma
// donde se quedó. Uso: node scripts/fetch_presas.mjs [desde] [hasta] [reverso]
import { chromium } from "playwright-core";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../data/raw/presas/", import.meta.url).pathname;
const API = "https://sinav30.conagua.gob.mx:8080/PresasPG/presas/reporte/";
const APP = "https://sinav30.conagua.gob.mx:8080/Presas/";
const desde = new Date(process.argv[2] ?? "2000-01-05");
const hasta = new Date(process.argv[3] ?? "2025-04-23");
const PAUSA_MS = 700;

const fechas = [];
for (let d = new Date(hasta); d >= desde; d.setUTCDate(d.getUTCDate() - 7)) fechas.push(d.toISOString().slice(0, 10));
fechas.reverse();
const pendientes = fechas.filter((f) => !existsSync(join(OUT, `${f}.json`)));
// "reverso" recorre de la fecha más reciente hacia atrás: permite un segundo proceso en paralelo.
if (process.argv[4] === "reverso") pendientes.reverse();
console.log(`${fechas.length} fechas semanales, ${pendientes.length} pendientes`);

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const abrir = () => page.goto(APP, { waitUntil: "networkidle", timeout: 90_000 });
await abrir();

let hechos = 0;
let vacios = 0;
for (const f of pendientes) {
  if (existsSync(join(OUT, `${f}.json`))) continue; // otro proceso ya la bajó
  let datos = null;
  for (let intento = 1; intento <= 4 && datos === null; intento++) {
    const r = await page.evaluate(async (u) => {
      try {
        const res = await fetch(u);
        return { ok: res.ok, texto: await res.text() };
      } catch (e) {
        return { ok: false, texto: String(e) };
      }
    }, API + f);
    try {
      if (!r.ok) throw new Error(r.texto.slice(0, 80));
      datos = JSON.parse(r.texto);
    } catch (e) {
      console.warn(`  ${f} intento ${intento}: ${e.message}`);
      await page.waitForTimeout(3000 * intento);
      await abrir(); // renueva la sesión si apareció el desafío anti-bots
    }
  }
  if (datos === null) {
    console.error(`  ✗ ${f} sin datos tras 4 intentos`);
    continue;
  }
  writeFileSync(join(OUT, `${f}.json`), JSON.stringify(datos));
  hechos++;
  if (!datos.length) vacios++;
  if (hechos % 50 === 0) console.log(`  ${hechos}/${pendientes.length} · última ${f} · ${datos.length} presas`);
  await page.waitForTimeout(PAUSA_MS);
}
console.log(`listo: ${hechos} descargadas (${vacios} vacías)`);
await browser.close();
