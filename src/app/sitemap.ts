import type { MetadataRoute } from "next";
import agua from "@/data/agua.json";
import presas from "@/data/presas_resumen.json";
import { SITIO } from "@/lib/sitio";

// La fecha de cada página es la de sus datos: así el buscador sabe cuándo hubo algo nuevo.
export default function sitemap(): MetadataRoute.Sitemap {
  const sequia = new Date(agua.sequia.actual.f);
  const presasF = new Date(presas.ultima);
  const reciente = sequia > presasF ? sequia : presasF;
  return [
    { url: `${SITIO}/`, lastModified: reciente, changeFrequency: "weekly", priority: 1 },
    { url: `${SITIO}/mapa`, lastModified: new Date("2023-11-09"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITIO}/presas`, lastModified: presasF, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITIO}/sequia`, lastModified: sequia, changeFrequency: "weekly", priority: 0.8 },
  ];
}
