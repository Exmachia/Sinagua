/**
 * Diseño de las tarjetas para compartir (1200×630), para ImageResponse de next/og.
 * Satori solo entiende flexbox y estilos en línea: nada de clases de Tailwind aquí.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tarjeta } from "./datos";

export const TAMANO = { width: 1200, height: 630 };

const PAPEL = "#fbfaf7";
const TINTA = "#191714";
const TINTA_2 = "#4d4943";
const ROJO = "#8c3436";

export async function fuentes() {
  const dir = join(process.cwd(), "src/og/fuentes");
  const [serif, sans, sansBold] = await Promise.all([
    readFile(join(dir, "Newsreader-SemiBold.ttf")),
    readFile(join(dir, "SchibstedGrotesk-Regular.ttf")),
    readFile(join(dir, "SchibstedGrotesk-SemiBold.ttf")),
  ]);
  return [
    { name: "Newsreader", data: serif, weight: 600 as const, style: "normal" as const },
    { name: "Schibsted", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Schibsted", data: sansBold, weight: 600 as const, style: "normal" as const },
  ];
}

function Marca() {
  return (
    <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 40, color: TINTA }}>
      <span style={{ color: ROJO }}>Sin</span>
      <span>agua</span>
    </div>
  );
}

function Pie({ derecha }: { derecha: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${TINTA}`, paddingTop: 22 }}>
      <Marca />
      <div style={{ display: "flex", fontSize: 22, color: TINTA_2 }}>{derecha}</div>
    </div>
  );
}

/** Tarjeta de una ficha: acuífero, municipio, estado o presa. */
export function TarjetaFicha({ t }: { t: Tarjeta }) {
  const largo = t.titulo.length > 26;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      background: PAPEL, padding: "56px 72px 48px", fontFamily: "Schibsted", color: TINTA }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: ROJO }}>{t.sobre}</div>
        <div style={{ display: "flex", marginTop: 8, fontFamily: "Newsreader", fontSize: largo ? 64 : 80, lineHeight: 1.02, letterSpacing: -1.5 }}>
          {t.titulo}
        </div>
        {t.etiqueta && (
          <div style={{ display: "flex", alignItems: "center", marginTop: 20, fontSize: 24, fontWeight: 600 }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: t.etiqueta.color, border: "3px solid white", boxShadow: "0 0 0 1px rgba(0,0,0,0.25)", marginRight: 12 }} />
            {t.etiqueta.texto}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 128, lineHeight: 1, letterSpacing: -3 }}>{t.cifra}</div>
          <div style={{ display: "flex", marginLeft: 22, fontSize: 32, color: TINTA_2, maxWidth: 560, lineHeight: 1.2 }}>{t.cifraTexto}</div>
        </div>
        {t.barra && (
          <div style={{ display: "flex", position: "relative", marginTop: 22, height: 22, width: 1056, borderRadius: 11, background: "#ece8df" }}>
            <div style={{ display: "flex", width: `${Math.max(t.barra.pct, 1.5)}%`, height: 22, borderRadius: 11, background: t.barra.color }} />
            {t.barra.marca !== undefined && (
              <div style={{ display: "flex", position: "absolute", left: `${Math.min(t.barra.marca, 100)}%`, top: -8, width: 4, height: 38, background: TINTA, borderRadius: 2 }} />
            )}
          </div>
        )}
        {t.frase && <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: TINTA_2 }}>{t.frase}</div>}
      </div>

      <Pie derecha="¿Y bajo tus pies? · datos oficiales" />
    </div>
  );
}

/** Tarjeta general del sitio. */
export function TarjetaGeneral({ cifras }: { cifras: { valor: string; texto: string }[] }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      background: PAPEL, padding: "60px 72px 48px", fontFamily: "Schibsted", color: TINTA }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: ROJO }}>El agua de México · datos oficiales</div>
        <div style={{ display: "flex", marginTop: 10, fontFamily: "Newsreader", fontSize: 96, lineHeight: 1, letterSpacing: -2.5, maxWidth: 1000 }}>
          México se está quedando sin agua
        </div>
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        {cifras.map((c) => (
          <div key={c.texto} style={{ display: "flex", flexDirection: "column", flex: 1, borderTop: `3px solid ${ROJO}`, paddingTop: 16 }}>
            <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 64, lineHeight: 1 }}>{c.valor}</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 24, color: TINTA_2, lineHeight: 1.25 }}>{c.texto}</div>
          </div>
        ))}
      </div>
      <Pie derecha="Busca tu municipio" />
    </div>
  );
}
