/**
 * Imagen vertical para historias de Instagram (1080×1920) de cada alerta de /urgente.
 * Fondo oscuro para que resalte entre otras historias. Satori: solo flexbox y estilos en línea.
 */
import type { Alerta } from "@/lib/urgente";

export const TAMANO_HISTORIA = { width: 1080, height: 1920 };

const FONDO = "#191714";
const TEXTO = "#f2ebe1";
const TENUE = "#b8b0a3";
const ACENTO = "#e7a98a";
const ROJO = "#c2463f";

export function Historia({ a }: { a: Alerta }) {
  const largo = a.titulo.length > 60;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      background: FONDO, padding: "230px 90px 250px", fontFamily: "Schibsted", color: TEXTO }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 54 }}>
            <span style={{ color: ACENTO }}>Sin</span>
            <span>agua</span>
          </div>
          <div style={{ display: "flex", background: ROJO, color: "#fff", fontSize: 30, fontWeight: 600, letterSpacing: 3,
            padding: "12px 26px", borderRadius: 40 }}>
            URGENTE
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 80, fontSize: 36, fontWeight: 600, color: ACENTO }}>{a.etiqueta} · {a.lugar}</div>
        <div style={{ display: "flex", marginTop: 26, fontFamily: "Newsreader", fontSize: largo || a.reporte ? 82 : 96, lineHeight: 1.04, letterSpacing: -2 }}>
          {a.titulo}
        </div>

        {a.reporte ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
            <div style={{ display: "flex", fontSize: 34, lineHeight: 1.35, color: TEXTO }}>{a.reporte}</div>
            {a.datosOficiales && a.datosOficiales.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 46, borderTop: `2px solid ${TENUE}`, paddingTop: 30 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: TENUE, letterSpacing: 1 }}>DATOS OFICIALES</div>
                {a.datosOficiales.map((d) => (
                  <div key={d.texto} style={{ display: "flex", marginTop: 14, fontSize: 30, lineHeight: 1.3 }}>{d.texto}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
            {a.datos.slice(0, 2).map((d) => (
              <div key={d.texto} style={{ display: "flex", flexDirection: "column", borderTop: `2px solid #3a3631`, paddingTop: 26, marginTop: 30 }}>
                <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: d.valor.length > 14 ? 52 : 92, lineHeight: 1 }}>{d.valor}</div>
                <div style={{ display: "flex", marginTop: 10, fontSize: 34, color: TENUE, lineHeight: 1.25 }}>{d.texto}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", background: "#2a2622", borderRadius: 28, padding: "34px 40px", marginTop: 40 }}>
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 50, lineHeight: 1.1 }}>
            {a.lugar === "México" ? "México necesita que se sepa." : `${a.lugar.split(",")[0]} necesita que se sepa.`}
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 32, color: TENUE }}>Compártelo. Mira todos los datos en</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 40, fontWeight: 600, color: ACENTO }}>sinagua.org/urgente</div>
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 24, color: "#857d71" }}>Fuente: {a.fuente}</div>
      </div>
    </div>
  );
}
