import { ImageResponse } from "next/og";
import { fmt } from "@/lib/acuiferos";
import agua from "@/data/agua.json";
import proy from "@/data/proyecciones.json";
import { fuentes, TAMANO, TarjetaGeneral } from "@/og/tarjeta";

export const alt = "Sinagua: México se está quedando sin agua";
export const size = TAMANO;
export const contentType = "image/png";

/** Tarjeta para compartir el sitio (portada y mapas). Se regenera con cada actualización de datos. */
export default async function Imagen() {
  const app = agua.aguaPorPersona;
  const caida = Math.round((1 - app.nacional[app.nacional.length - 1].m3 / app.nacional[0].m3) * 100);
  const ultimo = proy.serie[proy.serie.length - 1];
  return new ImageResponse(
    (
      <TarjetaGeneral
        cifras={[
          { valor: `${Math.round(app.pctEscasez / 10)} de 10`, texto: "mexicanos viven donde el agua ya escasea" },
          { valor: `−${caida}%`, texto: `agua por persona desde ${app.nacional[0].y}` },
          { valor: `${fmt(Math.round((ultimo.personas / proy.poblacion) * 10), 0)} de 10`, texto: "viven sobre un acuífero sobreexplotado" },
        ]}
      />
    ),
    { ...TAMANO, fonts: await fuentes() },
  );
}
